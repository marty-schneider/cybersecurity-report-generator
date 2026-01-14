import NodeCache from 'node-cache'
import { logger } from '../utils/logger.js'

interface CVEData {
  cveId: string
  description: string
  cvssScore: number
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'
  cvssVector: string
  published: Date
  references: string[]
  affectedProducts: string[]
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

interface NVDCVEItem {
  cve: {
    id: string
    descriptions: Array<{
      lang: string
      value: string
    }>
    published: string
    references?: Array<{
      url: string
    }>
    metrics?: {
      cvssMetricV31?: Array<{
        cvssData: {
          baseScore: number
          baseSeverity: string
          vectorString: string
        }
      }>
      cvssMetricV30?: Array<{
        cvssData: {
          baseScore: number
          baseSeverity: string
          vectorString: string
        }
      }>
    }
  }
  configurations?: {
    nodes: Array<{
      cpeMatch?: Array<{
        criteria: string
        vulnerable: boolean
      }>
    }>
  }
}

interface NVDResponse {
  vulnerabilities: Array<{
    cve: NVDCVEItem['cve']
  }>
  resultsPerPage: number
  totalResults: number
}

export class CVEService {
  private cache: NodeCache
  private rateLimitMap: Map<string, RateLimitEntry>
  private readonly NVD_API_URL = 'https://services.nvd.nist.gov/rest/json/cves/2.0'
  private readonly RATE_LIMIT_REQUESTS = 5
  private readonly RATE_LIMIT_WINDOW = 30000 // 30 seconds in milliseconds
  private readonly CACHE_TTL = 3600 // 1 hour in seconds
  private readonly MAX_RETRIES = 3
  private readonly RETRY_DELAY = 1000 // 1 second

  constructor() {
    // Initialize cache with 1 hour TTL and check period of 10 minutes
    this.cache = new NodeCache({
      stdTTL: this.CACHE_TTL,
      checkperiod: 600,
      useClones: false,
    })
    this.rateLimitMap = new Map()

    logger.info('CVE Service initialized')
  }

  /**
   * Lookup CVE information from NVD API
   * @param cveId - CVE identifier (e.g., CVE-2021-44228)
   * @returns CVE data or null if not found
   */
  async lookupCVE(cveId: string): Promise<CVEData | null> {
    try {
      // Validate CVE ID format
      if (!this.isValidCVEId(cveId)) {
        throw new Error(`Invalid CVE ID format: ${cveId}`)
      }

      // Normalize CVE ID to uppercase
      const normalizedCveId = cveId.toUpperCase()

      // Check cache first
      const cachedData = this.cache.get<CVEData>(normalizedCveId)
      if (cachedData) {
        logger.info(`Cache hit for CVE: ${normalizedCveId}`)
        return cachedData
      }

      // Check rate limit
      await this.checkRateLimit()

      // Fetch from NVD API with retry logic
      const cveData = await this.fetchCVEWithRetry(normalizedCveId)

      // Cache the result if found
      if (cveData) {
        this.cache.set(normalizedCveId, cveData)
        logger.info(`Successfully fetched and cached CVE: ${normalizedCveId}`)
      }

      return cveData
    } catch (error) {
      logger.error(`Error looking up CVE ${cveId}:`, error)
      throw error
    }
  }

  /**
   * Fetch CVE data with retry logic
   */
  private async fetchCVEWithRetry(cveId: string, retryCount = 0): Promise<CVEData | null> {
    try {
      return await this.fetchCVEFromAPI(cveId)
    } catch (error: any) {
      // If rate limited or server error and we haven't exceeded max retries
      if (retryCount < this.MAX_RETRIES) {
        const isRetryableError =
          error.status === 429 || // Rate limited
          error.status === 503 || // Service unavailable
          error.status === 500 // Internal server error

        if (isRetryableError) {
          const delay = this.RETRY_DELAY * Math.pow(2, retryCount) // Exponential backoff
          logger.warn(
            `Retrying CVE lookup for ${cveId} after ${delay}ms (attempt ${retryCount + 1}/${this.MAX_RETRIES})`
          )
          await this.sleep(delay)
          return this.fetchCVEWithRetry(cveId, retryCount + 1)
        }
      }

      // If not retryable or max retries exceeded, throw the error
      throw error
    }
  }

  /**
   * Fetch CVE data from NVD API
   */
  private async fetchCVEFromAPI(cveId: string): Promise<CVEData | null> {
    const apiKey = process.env.NVD_API_KEY
    const url = `${this.NVD_API_URL}?cveId=${cveId}`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Add API key if available (allows higher rate limits)
    if (apiKey) {
      headers['apiKey'] = apiKey
    }

    logger.info(`Fetching CVE data from NVD API: ${cveId}`)

    const response = await fetch(url, { headers })

    if (response.status === 404) {
      logger.warn(`CVE not found: ${cveId}`)
      return null
    }

    if (!response.ok) {
      const error: any = new Error(`NVD API error: ${response.status} ${response.statusText}`)
      error.status = response.status
      throw error
    }

    const data = (await response.json()) as NVDResponse

    // Check if CVE exists in response
    if (!data.vulnerabilities || data.vulnerabilities.length === 0) {
      logger.warn(`No vulnerability data found for CVE: ${cveId}`)
      return null
    }

    return this.parseCVEData(data.vulnerabilities[0].cve)
  }

  /**
   * Parse NVD API response into CVEData format
   */
  private parseCVEData(cveItem: NVDCVEItem['cve']): CVEData {
    // Extract English description
    const englishDesc = cveItem.descriptions.find((desc) => desc.lang === 'en')
    const description = englishDesc?.value || 'No description available'

    // Extract CVSS v3.1 metrics (fallback to v3.0 if v3.1 not available)
    let cvssScore = 0
    let severity: CVEData['severity'] = 'INFO'
    let cvssVector = 'N/A'

    const cvssV31 = cveItem.metrics?.cvssMetricV31?.[0]?.cvssData
    const cvssV30 = cveItem.metrics?.cvssMetricV30?.[0]?.cvssData
    const cvssData = cvssV31 || cvssV30

    if (cvssData) {
      cvssScore = cvssData.baseScore
      cvssVector = cvssData.vectorString
      severity = this.normalizeSeverity(cvssData.baseSeverity)
    }

    // Extract references
    const references = cveItem.references?.map((ref) => ref.url) || []

    // Extract affected products from CPE matches
    const affectedProducts = this.extractAffectedProducts(cveItem)

    return {
      cveId: cveItem.id,
      description,
      cvssScore,
      severity,
      cvssVector,
      published: new Date(cveItem.published),
      references,
      affectedProducts,
    }
  }

  /**
   * Extract affected products from CVE data
   */
  private extractAffectedProducts(cveItem: any): string[] {
    const products: string[] = []

    try {
      // Note: The actual structure varies, but typically configurations contain CPE data
      // For simplicity, we'll extract product info if available
      // In a full implementation, you would parse CPE strings more thoroughly

      if (cveItem.configurations?.nodes) {
        for (const node of cveItem.configurations.nodes) {
          if (node.cpeMatch) {
            for (const cpe of node.cpeMatch) {
              if (cpe.vulnerable && cpe.criteria) {
                // CPE format: cpe:2.3:part:vendor:product:version:...
                // We'll extract vendor and product
                const cpeProduct = this.parseCPE(cpe.criteria)
                if (cpeProduct) {
                  products.push(cpeProduct)
                }
              }
            }
          }
        }
      }
    } catch (error) {
      logger.warn('Error extracting affected products:', error)
    }

    // Remove duplicates
    return Array.from(new Set(products))
  }

  /**
   * Parse CPE string to extract product information
   */
  private parseCPE(cpe: string): string | null {
    try {
      // CPE format: cpe:2.3:part:vendor:product:version:update:edition:language:sw_edition:target_sw:target_hw:other
      const parts = cpe.split(':')
      if (parts.length >= 5) {
        const vendor = parts[3]
        const product = parts[4]
        const version = parts[5] || '*'

        // Decode URI components and format nicely
        const decodedVendor = decodeURIComponent(vendor).replace(/_/g, ' ')
        const decodedProduct = decodeURIComponent(product).replace(/_/g, ' ')
        const decodedVersion = decodeURIComponent(version).replace(/_/g, ' ')

        if (decodedVersion === '*') {
          return `${decodedVendor} ${decodedProduct}`
        }
        return `${decodedVendor} ${decodedProduct} ${decodedVersion}`
      }
    } catch (error) {
      logger.warn(`Error parsing CPE: ${cpe}`, error)
    }
    return null
  }

  /**
   * Normalize severity to standard values
   */
  private normalizeSeverity(severity: string): CVEData['severity'] {
    const normalized = severity.toUpperCase()
    switch (normalized) {
      case 'CRITICAL':
        return 'CRITICAL'
      case 'HIGH':
        return 'HIGH'
      case 'MEDIUM':
        return 'MEDIUM'
      case 'LOW':
        return 'LOW'
      default:
        return 'INFO'
    }
  }

  /**
   * Validate CVE ID format (CVE-YYYY-NNNNN+)
   */
  private isValidCVEId(cveId: string): boolean {
    const cvePattern = /^CVE-\d{4}-\d{4,}$/i
    return cvePattern.test(cveId)
  }

  /**
   * Check and enforce rate limiting
   */
  private async checkRateLimit(): Promise<void> {
    const key = 'nvd_api'
    const now = Date.now()
    const entry = this.rateLimitMap.get(key)

    // Clean up old entry if reset time has passed
    if (entry && now >= entry.resetTime) {
      this.rateLimitMap.delete(key)
    }

    const currentEntry = this.rateLimitMap.get(key)

    if (!currentEntry) {
      // Create new rate limit entry
      this.rateLimitMap.set(key, {
        count: 1,
        resetTime: now + this.RATE_LIMIT_WINDOW,
      })
      return
    }

    if (currentEntry.count >= this.RATE_LIMIT_REQUESTS) {
      const waitTime = currentEntry.resetTime - now
      logger.warn(`Rate limit reached. Waiting ${waitTime}ms before next request`)
      await this.sleep(waitTime)

      // Reset the rate limit after waiting
      this.rateLimitMap.set(key, {
        count: 1,
        resetTime: Date.now() + this.RATE_LIMIT_WINDOW,
      })
    } else {
      // Increment count
      currentEntry.count++
    }
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Clear cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.cache.flushAll()
    logger.info('CVE cache cleared')
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      keys: this.cache.keys().length,
      stats: this.cache.getStats(),
    }
  }

  /**
   * Batch lookup multiple CVEs (respects rate limiting)
   */
  async lookupMultipleCVEs(cveIds: string[]): Promise<Map<string, CVEData | null>> {
    const results = new Map<string, CVEData | null>()

    for (const cveId of cveIds) {
      try {
        const data = await this.lookupCVE(cveId)
        results.set(cveId, data)
      } catch (error) {
        logger.error(`Failed to lookup CVE ${cveId}:`, error)
        results.set(cveId, null)
      }
    }

    return results
  }
}

// Export singleton instance
export const cveService = new CVEService()
