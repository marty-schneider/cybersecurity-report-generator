/**
 * CVE Service Usage Examples
 *
 * This file demonstrates how to use the CVE Service to lookup vulnerability information
 * from the National Vulnerability Database (NVD).
 */

import { cveService } from './cveService.js'

/**
 * Example 1: Basic CVE lookup
 */
async function exampleBasicLookup() {
  try {
    // Look up the infamous Log4Shell vulnerability
    const cveData = await cveService.lookupCVE('CVE-2021-44228')

    if (cveData) {
      console.log('CVE ID:', cveData.cveId)
      console.log('Description:', cveData.description)
      console.log('CVSS Score:', cveData.cvssScore)
      console.log('Severity:', cveData.severity)
      console.log('CVSS Vector:', cveData.cvssVector)
      console.log('Published:', cveData.published)
      console.log('References:', cveData.references.slice(0, 3)) // First 3 references
      console.log('Affected Products:', cveData.affectedProducts.slice(0, 5)) // First 5 products
    } else {
      console.log('CVE not found')
    }
  } catch (error) {
    console.error('Error looking up CVE:', error)
  }
}

/**
 * Example 2: Lookup multiple CVEs
 */
async function exampleBatchLookup() {
  const cveIds = [
    'CVE-2021-44228', // Log4Shell
    'CVE-2014-0160',  // Heartbleed
    'CVE-2017-5638',  // Apache Struts
  ]

  try {
    const results = await cveService.lookupMultipleCVEs(cveIds)

    results.forEach((cveData, cveId) => {
      if (cveData) {
        console.log(`\n${cveId}:`)
        console.log(`  Severity: ${cveData.severity}`)
        console.log(`  Score: ${cveData.cvssScore}`)
        console.log(`  Published: ${cveData.published.toISOString()}`)
      } else {
        console.log(`\n${cveId}: Not found`)
      }
    })
  } catch (error) {
    console.error('Error in batch lookup:', error)
  }
}

/**
 * Example 3: Handle non-existent CVE
 */
async function exampleNotFound() {
  try {
    const cveData = await cveService.lookupCVE('CVE-9999-99999')

    if (cveData === null) {
      console.log('CVE not found in NVD database')
    }
  } catch (error) {
    console.error('Error:', error)
  }
}

/**
 * Example 4: Cache management
 */
async function exampleCacheManagement() {
  // First lookup (fetches from API)
  console.log('First lookup (from API):')
  const start1 = Date.now()
  await cveService.lookupCVE('CVE-2021-44228')
  console.log(`Time: ${Date.now() - start1}ms`)

  // Second lookup (from cache)
  console.log('\nSecond lookup (from cache):')
  const start2 = Date.now()
  await cveService.lookupCVE('CVE-2021-44228')
  console.log(`Time: ${Date.now() - start2}ms`)

  // Check cache stats
  const stats = cveService.getCacheStats()
  console.log('\nCache stats:', stats)

  // Clear cache if needed
  cveService.clearCache()
  console.log('Cache cleared')
}

/**
 * Example 5: Error handling with invalid CVE ID
 */
async function exampleInvalidCVE() {
  try {
    await cveService.lookupCVE('INVALID-ID')
  } catch (error: any) {
    console.log('Expected error:', error.message)
    // Output: "Invalid CVE ID format: INVALID-ID"
  }
}

/**
 * Example 6: Integration in an Express route
 */
/*
import { Request, Response } from 'express'

export async function getCVEHandler(req: Request, res: Response) {
  try {
    const { cveId } = req.params

    const cveData = await cveService.lookupCVE(cveId)

    if (!cveData) {
      return res.status(404).json({
        error: 'CVE not found',
        cveId,
      })
    }

    return res.json({
      success: true,
      data: cveData,
    })
  } catch (error: any) {
    console.error('CVE lookup error:', error)

    return res.status(500).json({
      error: 'Failed to lookup CVE',
      message: error.message,
    })
  }
}
*/

// Uncomment to run examples:
// exampleBasicLookup()
// exampleBatchLookup()
// exampleNotFound()
// exampleCacheManagement()
// exampleInvalidCVE()
