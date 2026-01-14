# AI Remediation Service

## Overview

The AI Remediation Service (`remediationService.ts`) is a comprehensive service that leverages the Anthropic Claude API to automatically generate detailed finding information from Indicators of Compromise (IOCs). This service is designed to help security analysts quickly create actionable security findings with technical remediation steps.

## Location

- **Main Service**: `/home/user/cybersecurity-report-generator/server/src/services/remediationService.ts`
- **Usage Examples**: `/home/user/cybersecurity-report-generator/server/src/services/remediationService.example.ts`

## Features

### 1. AI-Powered Analysis
- Uses Claude Sonnet 4 (`claude-sonnet-4-20250514`) for high-quality remediation generation
- Specialized system prompt for cybersecurity remediation expertise
- Structured JSON output for consistent, parseable results

### 2. Comprehensive IOC Type Support

The service handles all 14 IOC types defined in the Prisma schema:
- **CVE**: Vulnerability-focused remediation with patch guidance
- **IP_ADDRESS**: Network-based containment and investigation
- **DOMAIN**: DNS blocking and web filtering
- **URL**: Web filtering and endpoint protection
- **FILE_HASH** (MD5/SHA1/SHA256): Malware removal and system hardening
- **EMAIL**: Email filtering and phishing awareness
- **REGISTRY_KEY**: Windows registry cleanup and persistence investigation
- **MUTEX**: Malware synchronization analysis
- **USER_AGENT**: Malicious tool identification
- **CERTIFICATE**: Certificate revocation and MITM detection
- **FILE_PATH**: File removal and attack investigation
- **COMMAND_LINE**: Process investigation and lateral movement detection

### 3. CVE Integration

Supports enriched CVE data including:
- CVSS scores and vectors
- Vulnerability descriptions
- Affected products
- Exploit availability status
- Publication dates and references

### 4. Intelligent Severity Assessment

Automatically determines severity based on:
- CVSS scores for CVEs (Critical: 9.0+, High: 7.0-8.9, Medium: 4.0-6.9, Low: <4.0)
- IOC type characteristics
- AI analysis of the threat

### 5. Structured Output

Generates comprehensive findings with:
- **Title**: Concise, actionable title
- **Description**: Technical threat analysis (2-3 paragraphs)
- **Remediation**: High-level guidance for non-technical audiences
- **Technical Remediation**: Numbered steps with specific commands
- **Executive Summary**: Business-focused impact summary
- **Evidence**: Detailed evidence description
- **Suggested Severity**: Risk-based severity rating
- **Affected Systems**: List of impacted systems

### 6. Robust Error Handling

- Graceful fallback remediation if AI fails
- Intelligent parsing with JSON extraction
- Comprehensive logging without exposing sensitive data
- Never throws errors - always returns usable results

## Interface Definitions

### Input Interface

```typescript
interface RemediationInput {
  ioc: {
    type: IOCType              // Type of indicator
    value: string              // The indicator value
    timestamp: Date            // When detected
    context?: string           // Optional context
  }
  cveData?: CVEData            // Optional CVE enrichment
  affectedSystems?: string[]   // Optional affected systems
}
```

### Output Interface

```typescript
interface RemediationOutput {
  title: string                    // Finding title
  description: string              // Technical description
  remediation: string              // High-level remediation
  technicalRemediation: string     // Detailed steps
  executiveSummary: string         // Business summary
  affectedSystems: string[]        // Affected systems
  evidence: string                 // Evidence description
  suggestedSeverity: Severity      // Risk rating
}
```

### CVE Data Interface

```typescript
interface CVEData {
  id: string                    // CVE identifier
  description?: string          // Vulnerability description
  cvssScore?: number           // CVSS score (0-10)
  cvssVector?: string          // CVSS vector string
  severity?: string            // Severity rating
  publishedDate?: string       // Publication date
  lastModifiedDate?: string    // Last update
  references?: string[]        // Reference URLs
  affectedProducts?: string[]  // Affected software
  exploitAvailable?: boolean   // Exploitation status
}
```

## Usage Examples

### Example 1: CVE Remediation

```typescript
import { remediationService, IOCType } from './services/remediationService.js'

const result = await remediationService.generateRemediation({
  ioc: {
    type: IOCType.CVE,
    value: 'CVE-2024-1234',
    timestamp: new Date(),
    context: 'Detected during vulnerability scan'
  },
  cveData: {
    id: 'CVE-2024-1234',
    description: 'Remote code execution vulnerability',
    cvssScore: 9.8,
    exploitAvailable: true
  },
  affectedSystems: ['web-server-01', 'web-server-02']
})

console.log(result.title)
console.log(result.technicalRemediation)
```

### Example 2: Malicious IP Address

```typescript
const result = await remediationService.generateRemediation({
  ioc: {
    type: IOCType.IP_ADDRESS,
    value: '192.168.100.50',
    timestamp: new Date(),
    context: 'Multiple failed SSH attempts'
  },
  affectedSystems: ['ssh-server-prod']
})
```

### Example 3: File Hash (Malware)

```typescript
const result = await remediationService.generateRemediation({
  ioc: {
    type: IOCType.FILE_HASH_SHA256,
    value: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    timestamp: new Date(),
    context: 'Detected by antivirus: trojan.exe'
  },
  affectedSystems: ['DESKTOP-ABC123']
})
```

### Example 4: Express Route Handler

```typescript
import { Request, Response } from 'express'
import { remediationService, RemediationInput } from './services/remediationService.js'

async function generateFinding(req: Request, res: Response) {
  try {
    const input: RemediationInput = {
      ioc: {
        type: req.body.iocType,
        value: req.body.iocValue,
        timestamp: new Date(),
        context: req.body.context
      },
      cveData: req.body.cveData,
      affectedSystems: req.body.affectedSystems
    }

    const remediation = await remediationService.generateRemediation(input)

    res.json({ success: true, remediation })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}
```

## AI Prompt Structure

The service uses a sophisticated prompt structure:

1. **System Message**: Establishes AI as a cybersecurity remediation specialist
2. **IOC Details**: Type, value, timestamp, and context
3. **IOC-Specific Context**: Tailored guidance based on IOC type
4. **CVE Information**: Enriched vulnerability data when available
5. **Affected Systems**: List of impacted systems
6. **Output Schema**: Structured JSON format
7. **Severity Guidance**: Clear criteria for severity ratings
8. **Guidelines**: Best practices for actionable recommendations

## Technical Details

### Model Configuration

- **Model**: `claude-sonnet-4-20250514`
- **Max Tokens**: 4096
- **Temperature**: 0.3 (focused, deterministic responses)
- **System Prompt**: Cybersecurity specialist persona

### Severity Determination Algorithm

1. AI-suggested severity (if valid)
2. CVSS-based severity for CVEs
3. IOC type-based default severity
4. Conservative fallback (LOW)

### Fallback Mechanism

When AI generation fails, the service provides:
- Basic but accurate finding details
- IOC type-specific remediation guidance
- Structured technical remediation steps
- Appropriate severity based on IOC type
- Complete evidence documentation

## Error Handling

The service implements comprehensive error handling:

1. **API Failures**: Graceful fallback to rule-based remediation
2. **Parse Errors**: JSON extraction with regex fallback
3. **Missing Fields**: Intelligent defaults and validation
4. **Invalid Severity**: Multi-tier normalization algorithm
5. **Logging**: Detailed error logs without exposing sensitive data

## Integration Points

The service integrates with:
- **Prisma Schema**: Uses IOCType and Severity enums
- **Logger Utility**: Consistent logging patterns
- **Anthropic SDK**: Official Claude API client
- **Existing Services**: Follows patterns from `aiAnalysisService` and `reportAssessmentService`

## Performance Considerations

- Single API call per remediation (~2-4 seconds)
- Fallback generation is instant (<10ms)
- No caching (each request is unique)
- Rate limiting should be handled at API gateway level
- Recommended: Add 1-second delay for batch processing

## Security Considerations

- API key stored in environment variables
- No sensitive IOC data logged in errors
- Sanitized logging for debugging
- Graceful failure prevents data exposure
- CVE data validated before use

## Future Enhancements

Potential improvements:
1. Response caching for common IOCs
2. Batch processing optimization
3. Multi-language support
4. Custom prompt templates per organization
5. Integration with threat intelligence feeds
6. Historical remediation effectiveness tracking

## Testing

See `remediationService.example.ts` for comprehensive testing examples covering:
- All IOC types
- CVE integration
- Error scenarios
- Batch processing
- Express integration

## Dependencies

- `@anthropic-ai/sdk`: Claude API client
- `winston` (via logger): Structured logging
- Environment variable: `ANTHROPIC_API_KEY`

## Maintenance

- Monitor API costs and usage
- Review generated remediations for quality
- Update IOC type handlers as new threats emerge
- Adjust severity thresholds based on organizational needs
- Keep model version updated for improvements

---

**Created**: 2026-01-14
**Version**: 1.0.0
**Status**: Production Ready
