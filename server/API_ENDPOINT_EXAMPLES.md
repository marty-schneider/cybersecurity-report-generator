# API Endpoint: Create Finding from IOC

## Endpoint
`POST /api/findings/from-ioc`

## Description
Creates a new finding from an IOC (Indicator of Compromise) with AI-powered content generation. This endpoint automatically generates comprehensive finding details including title, description, remediation steps, and severity assessment based on the IOC data.

## Features
- Accepts either existing IOC ID or new IOC data
- Automatically enriches CVE-type IOCs with data from the NVD API
- Uses AI to generate detailed finding content
- Creates junction table link between IOC and finding
- Returns metadata about AI generation and CVE data availability

## Authentication
Requires authentication via Bearer token in the Authorization header.

## Request Body

### Option 1: Using Existing IOC
```json
{
  "projectId": "string (required)",
  "iocId": "string (required)",
  "context": "string (optional)",
  "affectedSystems": ["string"] // optional array
}
```

### Option 2: Creating New IOC
```json
{
  "projectId": "string (required)",
  "iocData": {
    "type": "IOCType (required)", // CVE, IP_ADDRESS, DOMAIN, URL, FILE_HASH_SHA256, etc.
    "value": "string (required)",
    "timestamp": "ISO8601 string (required)",
    "context": "string (optional)",
    "source": "string (optional)",
    "enrichmentData": {} // optional JSON object
  },
  "context": "string (optional)", // fallback if iocData.context not provided
  "affectedSystems": ["string"] // optional array
}
```

## Response

### Success (201 Created)
```json
{
  "finding": {
    "id": "string",
    "projectId": "string",
    "title": "string (AI-generated)",
    "description": "string (AI-generated)",
    "severity": "CRITICAL | HIGH | MEDIUM | LOW | INFO",
    "cvssScore": "number | null",
    "cveIdentifier": "string | null",
    "affectedSystems": ["string"],
    "evidence": "string (AI-generated)",
    "remediation": "string (AI-generated)",
    "status": "NEW",
    "aiGenerated": true,
    "userModified": false,
    "assignedTo": "string | null",
    "assignee": {
      "id": "string",
      "name": "string",
      "email": "string"
    } | null,
    "createdAt": "ISO8601 string",
    "updatedAt": "ISO8601 string"
  },
  "metadata": {
    "isAIGenerated": true,
    "iocId": "string",
    "iocType": "string",
    "iocValue": "string",
    "cveDataAvailable": "boolean"
  }
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "error": "Project ID is required"
}
```
```json
{
  "error": "Either iocId or iocData must be provided"
}
```
```json
{
  "error": "iocData must include type, value, and timestamp"
}
```

#### 404 Not Found
```json
{
  "error": "Project not found or insufficient permissions"
}
```
```json
{
  "error": "IOC not found or does not belong to this project"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Failed to generate AI content for finding. Please try manual entry or contact support."
}
```

## Example Usage

### Example 1: Create Finding from Existing IOC
```bash
curl -X POST http://localhost:3000/api/findings/from-ioc \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "projectId": "abc123",
    "iocId": "ioc-456",
    "affectedSystems": ["web-server-01", "web-server-02"]
  }'
```

### Example 2: Create Finding from New CVE IOC
```bash
curl -X POST http://localhost:3000/api/findings/from-ioc \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "projectId": "abc123",
    "iocData": {
      "type": "CVE",
      "value": "CVE-2021-44228",
      "timestamp": "2024-01-15T10:30:00Z",
      "context": "Detected during vulnerability scan of production servers"
    },
    "affectedSystems": ["app-server-01", "app-server-02", "app-server-03"]
  }'
```

### Example 3: Create Finding from Malicious IP Address
```bash
curl -X POST http://localhost:3000/api/findings/from-ioc \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "projectId": "abc123",
    "iocData": {
      "type": "IP_ADDRESS",
      "value": "192.168.1.100",
      "timestamp": "2024-01-15T14:45:00Z",
      "context": "Suspicious connection attempt detected in firewall logs",
      "source": "Firewall IDS"
    },
    "affectedSystems": ["dmz-01"]
  }'
```

### Example 4: Create Finding from File Hash
```bash
curl -X POST http://localhost:3000/api/findings/from-ioc \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "projectId": "abc123",
    "iocData": {
      "type": "FILE_HASH_SHA256",
      "value": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "timestamp": "2024-01-15T16:00:00Z",
      "context": "Malicious file detected by endpoint protection",
      "source": "CrowdStrike EDR"
    },
    "affectedSystems": ["workstation-42"]
  }'
```

## Implementation Details

### Workflow
1. **Input Validation**: Validates required fields and user permissions
2. **IOC Retrieval/Creation**: Fetches existing IOC or creates new one
3. **CVE Enrichment**: For CVE-type IOCs, queries NVD API for vulnerability data
4. **AI Content Generation**: Uses Claude AI to generate comprehensive finding content
5. **Finding Creation**: Creates finding with AI-generated content and metadata
6. **IOC Linking**: Creates junction table entry linking IOC to finding
7. **Response**: Returns finding with metadata about AI generation

### Error Handling
- **CVE Lookup Failures**: Proceeds without CVE data, doesn't fail the request
- **AI Generation Failures**: Returns 500 error with suggestion to use manual entry
- **Authorization Failures**: Returns 404 if user doesn't have project access
- **Database Errors**: Handled by error middleware

### Special Features
- **Automatic CVE Enrichment**: For CVE-type IOCs, automatically fetches CVSS scores, severity ratings, and descriptions
- **Smart Severity Assessment**: AI determines severity based on IOC type, CVE data, and context
- **Comprehensive Content**: Generates title, description, evidence, and detailed remediation steps
- **Metadata Tracking**: Tracks AI generation status and CVE data availability

## Supported IOC Types
- `CVE` - Common Vulnerabilities and Exposures
- `IP_ADDRESS` - IP addresses
- `DOMAIN` - Domain names
- `URL` - URLs
- `FILE_HASH_MD5` - MD5 file hashes
- `FILE_HASH_SHA1` - SHA1 file hashes
- `FILE_HASH_SHA256` - SHA256 file hashes
- `EMAIL` - Email addresses
- `REGISTRY_KEY` - Windows registry keys
- `MUTEX` - Mutex names
- `USER_AGENT` - User agent strings
- `CERTIFICATE` - Certificate information
- `FILE_PATH` - File paths
- `COMMAND_LINE` - Command line arguments

## Notes
- Requires `ANTHROPIC_API_KEY` environment variable for AI content generation
- Optional `NVD_API_KEY` environment variable for higher CVE lookup rate limits
- Created findings have `aiGenerated: true` and `userModified: false` flags
- Junction table entry includes relevance field with description of the link
