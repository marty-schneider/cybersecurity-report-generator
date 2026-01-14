# CVE Lookup Service

A comprehensive service for looking up Common Vulnerabilities and Exposures (CVE) information from the National Vulnerability Database (NVD) API v2.0.

## Features

- **NVD API v2.0 Integration**: Fetches vulnerability data from the official NIST NVD API
- **Rate Limiting**: Implements 5 requests per 30 seconds (with API key) to comply with NVD rate limits
- **Intelligent Caching**: Uses node-cache to cache CVE data for 1 hour, reducing API calls
- **Retry Logic**: Automatic retry with exponential backoff for rate limit and server errors
- **Comprehensive Error Handling**: Graceful handling of API failures and missing CVEs
- **CVSS v3.1 Support**: Extracts CVSS scores, severity ratings, and vector strings
- **Product Information**: Parses CPE data to identify affected products and vendors
- **Batch Lookup**: Support for looking up multiple CVEs efficiently

## Installation

The required dependencies are already included in `package.json`:

```bash
npm install
```

Dependencies:
- `node-cache`: ^5.1.2 (for caching)

## Configuration

Add your NVD API key to the `.env` file:

```bash
NVD_API_KEY=your-nvd-api-key-here
```

**Note**: The service will work without an API key, but with lower rate limits (5 requests per 30 seconds with key vs. 5 per 30 seconds without key, but the API may enforce stricter limits without a key).

To obtain an API key:
1. Visit https://nvd.nist.gov/developers/request-an-api-key
2. Submit the request form
3. You'll receive the API key via email

## Usage

### Basic CVE Lookup

```typescript
import { cveService } from './services/cveService.js'

// Lookup a single CVE
const cveData = await cveService.lookupCVE('CVE-2021-44228')

if (cveData) {
  console.log('CVE ID:', cveData.cveId)
  console.log('Description:', cveData.description)
  console.log('CVSS Score:', cveData.cvssScore)
  console.log('Severity:', cveData.severity) // CRITICAL, HIGH, MEDIUM, LOW, INFO
  console.log('Published:', cveData.published)
  console.log('Affected Products:', cveData.affectedProducts)
}
```

### Batch Lookup

```typescript
const cveIds = ['CVE-2021-44228', 'CVE-2014-0160', 'CVE-2017-5638']
const results = await cveService.lookupMultipleCVEs(cveIds)

results.forEach((cveData, cveId) => {
  if (cveData) {
    console.log(`${cveId}: ${cveData.severity} - ${cveData.cvssScore}`)
  }
})
```

### Express Route Integration

```typescript
import { Request, Response } from 'express'
import { cveService } from '../services/cveService.js'

export async function getCVEHandler(req: Request, res: Response) {
  try {
    const { cveId } = req.params
    const cveData = await cveService.lookupCVE(cveId)

    if (!cveData) {
      return res.status(404).json({ error: 'CVE not found' })
    }

    return res.json({ success: true, data: cveData })
  } catch (error: any) {
    return res.status(500).json({
      error: 'Failed to lookup CVE',
      message: error.message
    })
  }
}
```

## API Reference

### `lookupCVE(cveId: string): Promise<CVEData | null>`

Looks up a single CVE by its identifier.

**Parameters:**
- `cveId` (string): The CVE identifier (e.g., "CVE-2021-44228")

**Returns:**
- `CVEData | null`: The CVE data if found, null if not found

**Throws:**
- Error if the CVE ID format is invalid
- Error if the API request fails

**Example:**
```typescript
const cve = await cveService.lookupCVE('CVE-2021-44228')
```

### `lookupMultipleCVEs(cveIds: string[]): Promise<Map<string, CVEData | null>>`

Looks up multiple CVEs in sequence (respects rate limiting).

**Parameters:**
- `cveIds` (string[]): Array of CVE identifiers

**Returns:**
- `Map<string, CVEData | null>`: Map of CVE ID to CVE data

**Example:**
```typescript
const results = await cveService.lookupMultipleCVEs(['CVE-2021-44228', 'CVE-2014-0160'])
```

### `clearCache(): void`

Clears all cached CVE data.

**Example:**
```typescript
cveService.clearCache()
```

### `getCacheStats(): object`

Returns cache statistics including number of cached entries and cache performance.

**Example:**
```typescript
const stats = cveService.getCacheStats()
console.log('Cached CVEs:', stats.keys)
```

## CVEData Interface

```typescript
interface CVEData {
  cveId: string                                      // CVE identifier
  description: string                                // English description
  cvssScore: number                                  // CVSS v3.1 base score (0-10)
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'  // Severity rating
  cvssVector: string                                 // CVSS vector string
  published: Date                                    // Publication date
  references: string[]                               // Reference URLs
  affectedProducts: string[]                         // Affected products/vendors
}
```

## Rate Limiting

The service implements rate limiting to comply with NVD API guidelines:

- **With API Key**: 5 requests per 30 seconds
- **Without API Key**: 5 requests per 30 seconds (but may be rate-limited more aggressively by NVD)

When the rate limit is reached, the service will:
1. Wait for the rate limit window to reset
2. Automatically retry the request

## Caching

All successful CVE lookups are cached for **1 hour** to:
- Reduce API calls to NVD
- Improve response times
- Minimize rate limit issues

Cache is automatically cleaned every 10 minutes.

## Error Handling

### CVE Not Found
Returns `null` when a CVE doesn't exist in the NVD database.

```typescript
const cve = await cveService.lookupCVE('CVE-9999-99999')
if (cve === null) {
  console.log('CVE not found')
}
```

### Invalid CVE Format
Throws an error for invalid CVE ID formats.

```typescript
try {
  await cveService.lookupCVE('INVALID-FORMAT')
} catch (error) {
  // Error: Invalid CVE ID format: INVALID-FORMAT
}
```

### API Failures
Automatically retries with exponential backoff for:
- Rate limit errors (429)
- Server errors (500)
- Service unavailable (503)

Maximum 3 retries with delays: 1s, 2s, 4s

## Best Practices

1. **Use API Key**: Always configure an API key for better rate limits
2. **Cache Appropriately**: The service caches for 1 hour by default
3. **Batch Lookups**: Use `lookupMultipleCVEs()` for multiple CVEs to benefit from rate limiting
4. **Error Handling**: Always handle null returns and errors appropriately
5. **Logging**: The service logs all operations using Winston logger

## Logging

The service logs important events:
- CVE lookups (hits/misses)
- Cache operations
- Rate limiting actions
- API errors
- Retry attempts

All logs are output via the Winston logger configured in `utils/logger.ts`.

## Examples

See `cveService.example.ts` for comprehensive usage examples including:
- Basic CVE lookup
- Batch lookups
- Cache management
- Error handling
- Express route integration

## Resources

- [NVD API Documentation](https://nvd.nist.gov/developers/vulnerabilities)
- [Request API Key](https://nvd.nist.gov/developers/request-an-api-key)
- [CVSS v3.1 Specification](https://www.first.org/cvss/v3.1/specification-document)
- [CPE Specification](https://nvlpubs.nist.gov/nistpubs/Legacy/IR/nistir7695.pdf)

## License

This service is part of the Cybersecurity Report Generator project.
