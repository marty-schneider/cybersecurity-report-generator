import { vi } from 'vitest'
import { cveService } from '../cveService.js'
import { mockPrisma } from '../../__mocks__/prisma.js'

const mockFetchResponse = (data: unknown, ok = true) => ({
  ok,
  json: async () => data,
})

describe('cveService.extractCVE', () => {
  it('extracts CVE ID from text', () => {
    expect(cveService.extractCVE('Affected by CVE-2021-44228 vulnerability')).toBe('CVE-2021-44228')
  })

  it('returns null for text with no CVE', () => {
    expect(cveService.extractCVE('No vulnerability here')).toBeNull()
  })

  it('case insensitive — uppercases result', () => {
    expect(cveService.extractCVE('found cve-2021-44228')).toBe('CVE-2021-44228')
  })

  it('handles 5+ digit suffix', () => {
    expect(cveService.extractCVE('CVE-2024-123456')).toBe('CVE-2024-123456')
  })

  it('returns first match when multiple CVEs', () => {
    expect(cveService.extractCVE('CVE-2021-44228 and CVE-2022-12345')).toBe('CVE-2021-44228')
  })
})

describe('cveService.lookupCVE', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns CVEData when API returns valid data', async () => {
    const nvdResponse = {
      vulnerabilities: [{
        cve: {
          id: 'CVE-2021-44228',
          descriptions: [{ lang: 'en', value: 'Log4Shell RCE' }],
          metrics: {
            cvssMetricV31: [{
              cvssData: { baseScore: 10.0, baseSeverity: 'CRITICAL', vectorString: 'AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H' },
            }],
          },
          references: [{ url: 'https://example.com', source: 'NVD' }],
          published: '2021-12-10',
          lastModified: '2021-12-15',
        },
      }],
    }
    vi.mocked(fetch).mockResolvedValueOnce(mockFetchResponse(nvdResponse) as Response)

    const result = await cveService.lookupCVE('CVE-2021-44228')

    expect(result).not.toBeNull()
    expect(result!.cveId).toBe('CVE-2021-44228')
    expect(result!.cvssScore).toBe(10.0)
    expect(result!.cvssSeverity).toBe('CRITICAL')
    expect(result!.description).toBe('Log4Shell RCE')
  })

  it('returns null when API returns empty vulnerabilities', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(mockFetchResponse({ vulnerabilities: [] }) as Response)

    const result = await cveService.lookupCVE('CVE-2099-99999')
    expect(result).toBeNull()
  })

  it('returns null when API returns non-200 status', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(mockFetchResponse({}, false) as Response)

    const result = await cveService.lookupCVE('CVE-2021-44228')
    expect(result).toBeNull()
  })

  it('returns null when fetch throws', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

    const result = await cveService.lookupCVE('CVE-2021-44228')
    expect(result).toBeNull()
  })

  it('includes apiKey header when NVD_API_KEY is set', async () => {
    process.env.NVD_API_KEY = 'test-api-key'
    vi.mocked(fetch).mockResolvedValueOnce(mockFetchResponse({ vulnerabilities: [] }) as Response)

    await cveService.lookupCVE('CVE-2021-44228')

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ apiKey: 'test-api-key' }),
      })
    )
    delete process.env.NVD_API_KEY
  })
})

describe('cveService.enrichFinding', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns null when finding not found', async () => {
    mockPrisma.finding.findUnique.mockResolvedValueOnce(null)

    const result = await cveService.enrichFinding('nonexistent')
    expect(result).toBeNull()
  })

  it('returns null when no CVE pattern found', async () => {
    mockPrisma.finding.findUnique.mockResolvedValueOnce({
      id: 'f1',
      title: 'SQL Injection',
      description: 'Found SQL injection vulnerability',
      cveId: null,
    })

    const result = await cveService.enrichFinding('f1')
    expect(result).toBeNull()
  })

  it('enriches finding when cveId exists', async () => {
    mockPrisma.finding.findUnique.mockResolvedValueOnce({
      id: 'f1',
      title: 'Log4Shell',
      description: 'RCE via Log4j',
      cveId: 'CVE-2021-44228',
      cvssScore: null,
    })

    const cveData = {
      cveId: 'CVE-2021-44228',
      description: 'Log4Shell RCE',
      cvssScore: 10.0,
      cvssSeverity: 'CRITICAL',
      cvssVector: 'AV:N',
      references: [],
      published: '2021-12-10',
      lastModified: '2021-12-15',
    }

    vi.mocked(fetch).mockResolvedValueOnce(mockFetchResponse({
      vulnerabilities: [{
        cve: {
          id: 'CVE-2021-44228',
          descriptions: [{ lang: 'en', value: 'Log4Shell RCE' }],
          metrics: {
            cvssMetricV31: [{
              cvssData: { baseScore: 10.0, baseSeverity: 'CRITICAL', vectorString: 'AV:N' },
            }],
          },
          references: [],
          published: '2021-12-10',
          lastModified: '2021-12-15',
        },
      }],
    }) as Response)

    mockPrisma.finding.update.mockResolvedValueOnce({})

    const result = await cveService.enrichFinding('f1')

    expect(result).not.toBeNull()
    expect(result!.cveId).toBe('CVE-2021-44228')
    expect(mockPrisma.finding.update).toHaveBeenCalledTimes(1)
  })
})
