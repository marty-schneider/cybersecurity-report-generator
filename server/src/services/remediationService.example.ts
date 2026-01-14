/**
 * Example usage of the RemediationService
 *
 * This file demonstrates how to use the AI Remediation Service
 * to generate comprehensive finding details from IOC data.
 */

import {
  remediationService,
  RemediationInput,
  RemediationOutput,
  IOCType,
  Severity,
  CVEData,
} from './remediationService.js'

// Example 1: Generate remediation for a CVE with full CVE data
async function exampleCVERemediation() {
  const cveData: CVEData = {
    id: 'CVE-2024-1234',
    description: 'Remote code execution vulnerability in Example Software',
    cvssScore: 9.8,
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
    severity: 'CRITICAL',
    publishedDate: '2024-01-15',
    exploitAvailable: true,
    affectedProducts: ['Example Software 1.0-2.5'],
  }

  const input: RemediationInput = {
    ioc: {
      type: IOCType.CVE,
      value: 'CVE-2024-1234',
      timestamp: new Date('2024-01-20T10:30:00Z'),
      context: 'Detected during vulnerability scan of production servers',
    },
    cveData,
    affectedSystems: ['web-server-01', 'web-server-02', 'api-gateway'],
  }

  const result: RemediationOutput = await remediationService.generateRemediation(input)

  console.log('CVE Remediation Generated:')
  console.log('Title:', result.title)
  console.log('Severity:', result.suggestedSeverity)
  console.log('Executive Summary:', result.executiveSummary)
  console.log('\nTechnical Remediation Steps:')
  console.log(result.technicalRemediation)

  return result
}

// Example 2: Generate remediation for a malicious IP address
async function exampleIPRemediation() {
  const input: RemediationInput = {
    ioc: {
      type: IOCType.IP_ADDRESS,
      value: '192.168.100.50',
      timestamp: new Date(),
      context: 'Multiple failed SSH login attempts from this IP, followed by successful authentication',
    },
    affectedSystems: ['ssh-server-prod'],
  }

  const result: RemediationOutput = await remediationService.generateRemediation(input)

  console.log('IP Address Remediation Generated:')
  console.log('Title:', result.title)
  console.log('Severity:', result.suggestedSeverity)
  console.log('\nDescription:')
  console.log(result.description)

  return result
}

// Example 3: Generate remediation for a malicious file hash
async function exampleFileHashRemediation() {
  const input: RemediationInput = {
    ioc: {
      type: IOCType.FILE_HASH_SHA256,
      value: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      timestamp: new Date(),
      context: 'Malicious file detected by antivirus on endpoint. File name: trojan.exe',
    },
    affectedSystems: ['DESKTOP-ABC123', 'LAPTOP-XYZ456'],
  }

  const result: RemediationOutput = await remediationService.generateRemediation(input)

  console.log('File Hash Remediation Generated:')
  console.log('Title:', result.title)
  console.log('Severity:', result.suggestedSeverity)
  console.log('\nEvidence:')
  console.log(result.evidence)
  console.log('\nRemediation:')
  console.log(result.remediation)

  return result
}

// Example 4: Generate remediation for a malicious domain
async function exampleDomainRemediation() {
  const input: RemediationInput = {
    ioc: {
      type: IOCType.DOMAIN,
      value: 'malicious-c2-server.example.com',
      timestamp: new Date(),
      context: 'DNS query detected from multiple endpoints. Known C2 server for ransomware.',
    },
    affectedSystems: ['workstation-001', 'workstation-045', 'workstation-089'],
  }

  const result: RemediationOutput = await remediationService.generateRemediation(input)

  console.log('Domain Remediation Generated:')
  console.log('Title:', result.title)
  console.log('Affected Systems:', result.affectedSystems)
  console.log('\nExecutive Summary:')
  console.log(result.executiveSummary)

  return result
}

// Example 5: Generate remediation for a suspicious registry key
async function exampleRegistryKeyRemediation() {
  const input: RemediationInput = {
    ioc: {
      type: IOCType.REGISTRY_KEY,
      value: 'HKEY_LOCAL_MACHINE\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\Malware',
      timestamp: new Date(),
      context: 'Persistence mechanism detected. Registry key points to suspicious executable.',
    },
    affectedSystems: ['DESKTOP-MALWARE'],
  }

  const result: RemediationOutput = await remediationService.generateRemediation(input)

  console.log('Registry Key Remediation Generated:')
  console.log('Title:', result.title)
  console.log('\nTechnical Remediation:')
  console.log(result.technicalRemediation)

  return result
}

// Example 6: Using the service in an Express route handler
import { Request, Response } from 'express'

async function generateFindingFromIOC(req: Request, res: Response) {
  try {
    const { iocType, iocValue, context, affectedSystems, cveData } = req.body

    const input: RemediationInput = {
      ioc: {
        type: iocType as IOCType,
        value: iocValue,
        timestamp: new Date(),
        context,
      },
      affectedSystems,
      cveData,
    }

    const remediation = await remediationService.generateRemediation(input)

    res.json({
      success: true,
      remediation,
    })
  } catch (error: any) {
    console.error('Failed to generate remediation:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to generate remediation',
      message: error.message,
    })
  }
}

// Example 7: Batch processing multiple IOCs
async function batchProcessIOCs(iocs: Array<{ type: IOCType; value: string; context?: string }>) {
  const results: RemediationOutput[] = []

  for (const ioc of iocs) {
    try {
      const input: RemediationInput = {
        ioc: {
          ...ioc,
          timestamp: new Date(),
        },
      }

      const result = await remediationService.generateRemediation(input)
      results.push(result)

      // Add delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000))
    } catch (error) {
      console.error(`Failed to process IOC ${ioc.value}:`, error)
    }
  }

  return results
}

// Run examples (uncomment to test)
// exampleCVERemediation().catch(console.error)
// exampleIPRemediation().catch(console.error)
// exampleFileHashRemediation().catch(console.error)
// exampleDomainRemediation().catch(console.error)
// exampleRegistryKeyRemediation().catch(console.error)

export {
  exampleCVERemediation,
  exampleIPRemediation,
  exampleFileHashRemediation,
  exampleDomainRemediation,
  exampleRegistryKeyRemediation,
  generateFindingFromIOC,
  batchProcessIOCs,
}
