import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const frameworks = [
  {
    name: 'NIST 800-53',
    version: 'Rev 5',
    shortCode: 'NIST_800_53',
    controls: [
      { controlId: 'AC-1', title: 'Access Control Policy and Procedures', description: 'Develop, document, and disseminate access control policy and procedures.', category: 'Access Control' },
      { controlId: 'AC-2', title: 'Account Management', description: 'Define and document types of accounts allowed and specifically prohibited; manage system accounts.', category: 'Access Control' },
      { controlId: 'AC-3', title: 'Access Enforcement', description: 'Enforce approved authorizations for logical access to information and system resources.', category: 'Access Control' },
      { controlId: 'AC-6', title: 'Least Privilege', description: 'Employ the principle of least privilege, allowing only authorized accesses for users.', category: 'Access Control' },
      { controlId: 'AC-7', title: 'Unsuccessful Logon Attempts', description: 'Enforce a limit of consecutive invalid logon attempts by a user.', category: 'Access Control' },
      { controlId: 'AU-2', title: 'Event Logging', description: 'Identify the types of events that the system is capable of logging.', category: 'Audit and Accountability' },
      { controlId: 'AU-3', title: 'Content of Audit Records', description: 'Ensure that audit records contain information that establishes what occurred.', category: 'Audit and Accountability' },
      { controlId: 'AU-6', title: 'Audit Record Review, Analysis, and Reporting', description: 'Review and analyze system audit records for indications of inappropriate activity.', category: 'Audit and Accountability' },
      { controlId: 'CA-7', title: 'Continuous Monitoring', description: 'Develop a system-level continuous monitoring strategy.', category: 'Assessment' },
      { controlId: 'CM-2', title: 'Baseline Configuration', description: 'Develop, document, and maintain a current baseline configuration of the system.', category: 'Configuration Management' },
      { controlId: 'CM-6', title: 'Configuration Settings', description: 'Establish and document configuration settings for IT products.', category: 'Configuration Management' },
      { controlId: 'CM-7', title: 'Least Functionality', description: 'Configure the system to provide only mission-essential capabilities.', category: 'Configuration Management' },
      { controlId: 'IA-2', title: 'Identification and Authentication (Users)', description: 'Uniquely identify and authenticate organizational users.', category: 'Identification and Authentication' },
      { controlId: 'IA-5', title: 'Authenticator Management', description: 'Manage system authenticators by verifying identity before distributing.', category: 'Identification and Authentication' },
      { controlId: 'IR-4', title: 'Incident Handling', description: 'Implement an incident handling capability for incidents.', category: 'Incident Response' },
      { controlId: 'IR-5', title: 'Incident Monitoring', description: 'Track and document system security incidents.', category: 'Incident Response' },
      { controlId: 'RA-5', title: 'Vulnerability Monitoring and Scanning', description: 'Monitor and scan for vulnerabilities in the system and hosted applications.', category: 'Risk Assessment' },
      { controlId: 'SC-7', title: 'Boundary Protection', description: 'Monitor and control communications at the external managed interfaces.', category: 'System and Communications Protection' },
      { controlId: 'SC-8', title: 'Transmission Confidentiality and Integrity', description: 'Protect the confidentiality and integrity of transmitted information.', category: 'System and Communications Protection' },
      { controlId: 'SC-13', title: 'Cryptographic Protection', description: 'Determine the cryptographic uses and implement cryptographic mechanisms.', category: 'System and Communications Protection' },
      { controlId: 'SI-2', title: 'Flaw Remediation', description: 'Identify, report, and correct system flaws.', category: 'System and Information Integrity' },
      { controlId: 'SI-3', title: 'Malicious Code Protection', description: 'Implement malicious code protection mechanisms at system entry and exit points.', category: 'System and Information Integrity' },
      { controlId: 'SI-4', title: 'System Monitoring', description: 'Monitor the system to detect attacks and unauthorized connections.', category: 'System and Information Integrity' },
      { controlId: 'SI-7', title: 'Software, Firmware, and Information Integrity', description: 'Employ integrity verification tools to detect unauthorized changes.', category: 'System and Information Integrity' },
    ],
  },
  {
    name: 'PCI DSS',
    version: '4.0',
    shortCode: 'PCI_DSS_4',
    controls: [
      { controlId: '1.2.1', title: 'Network Security Controls Configuration', description: 'Configuration standards for NSCs are defined, implemented, and maintained.', category: 'Network Security' },
      { controlId: '1.3.1', title: 'Inbound Traffic Restriction', description: 'Inbound traffic to the CDE is restricted to only necessary traffic.', category: 'Network Security' },
      { controlId: '1.3.2', title: 'Outbound Traffic Restriction', description: 'Outbound traffic from the CDE is restricted to only necessary traffic.', category: 'Network Security' },
      { controlId: '2.2.1', title: 'System Configuration Standards', description: 'Configuration standards are developed, maintained, and consistent with industry-accepted hardening standards.', category: 'Secure Configuration' },
      { controlId: '3.4.1', title: 'Primary Account Number Masking', description: 'PAN is masked when displayed, such that only authorized personnel can see more than the first six/last four digits.', category: 'Data Protection' },
      { controlId: '3.5.1', title: 'PAN Storage Protection', description: 'PAN is secured wherever it is stored using strong cryptography.', category: 'Data Protection' },
      { controlId: '4.2.1', title: 'Strong Cryptography in Transit', description: 'Strong cryptography is used when PAN is transmitted over open, public networks.', category: 'Encryption' },
      { controlId: '5.2.1', title: 'Anti-malware Deployed', description: 'An anti-malware solution is deployed on all systems commonly affected by malware.', category: 'Malware Protection' },
      { controlId: '5.3.1', title: 'Anti-malware Active and Maintained', description: 'The anti-malware solution is kept current via automatic updates.', category: 'Malware Protection' },
      { controlId: '6.2.4', title: 'Software Engineering Techniques', description: 'Software engineering techniques or other methods prevent or mitigate common software attacks.', category: 'Secure Development' },
      { controlId: '6.3.1', title: 'Security Vulnerabilities Identified and Managed', description: 'Security vulnerabilities are identified and managed with a formal process.', category: 'Secure Development' },
      { controlId: '7.2.1', title: 'Access Control System', description: 'An access control system is in place that restricts access based on need to know.', category: 'Access Control' },
      { controlId: '7.2.2', title: 'Appropriate Access Assignment', description: 'Access is assigned to users based on job classification and function.', category: 'Access Control' },
      { controlId: '8.3.1', title: 'Strong Authentication for Users', description: 'All user access to system components is authenticated using at least one authentication factor.', category: 'Authentication' },
      { controlId: '8.3.6', title: 'Password Complexity', description: 'Passwords/passphrases meet minimum complexity requirements.', category: 'Authentication' },
      { controlId: '8.6.1', title: 'System/Application Account Management', description: 'System and application accounts are managed based on least privilege.', category: 'Authentication' },
      { controlId: '10.2.1', title: 'Audit Logs Enabled', description: 'Audit logs are enabled and active for all system components and cardholder data.', category: 'Logging and Monitoring' },
      { controlId: '10.4.1', title: 'Audit Logs Reviewed', description: 'Audit logs are reviewed at least once daily for security events.', category: 'Logging and Monitoring' },
      { controlId: '11.3.1', title: 'Internal Vulnerability Scans', description: 'Internal vulnerability scans are performed at least quarterly.', category: 'Vulnerability Management' },
      { controlId: '11.4.1', title: 'Penetration Testing', description: 'External and internal penetration testing is regularly performed.', category: 'Vulnerability Management' },
      { controlId: '12.10.1', title: 'Incident Response Plan', description: 'An incident response plan exists and is ready to be activated.', category: 'Incident Response' },
    ],
  },
  {
    name: 'ISO 27001',
    version: '2022',
    shortCode: 'ISO_27001',
    controls: [
      { controlId: 'A.5.1', title: 'Policies for Information Security', description: 'A set of policies for information security shall be defined, approved by management, published and communicated.', category: 'Organizational Controls' },
      { controlId: 'A.5.15', title: 'Access Control', description: 'Rules to control physical and logical access to information shall be established and implemented.', category: 'Organizational Controls' },
      { controlId: 'A.5.23', title: 'Information Security for Cloud Services', description: 'Processes for acquisition, use, management and exit from cloud services shall be established.', category: 'Organizational Controls' },
      { controlId: 'A.5.24', title: 'Incident Management Planning', description: 'The organization shall plan and prepare for managing information security incidents.', category: 'Organizational Controls' },
      { controlId: 'A.5.28', title: 'Collection of Evidence', description: 'Procedures for the identification, collection, acquisition and preservation of evidence shall be established.', category: 'Organizational Controls' },
      { controlId: 'A.6.1', title: 'Screening', description: 'Background verification checks on candidates shall be carried out prior to joining.', category: 'People Controls' },
      { controlId: 'A.7.1', title: 'Physical Security Perimeters', description: 'Security perimeters shall be defined and used to protect areas containing information.', category: 'Physical Controls' },
      { controlId: 'A.8.1', title: 'User Endpoint Devices', description: 'Information stored on, processed by or accessible via user endpoint devices shall be protected.', category: 'Technological Controls' },
      { controlId: 'A.8.2', title: 'Privileged Access Rights', description: 'The allocation and use of privileged access rights shall be restricted and managed.', category: 'Technological Controls' },
      { controlId: 'A.8.5', title: 'Secure Authentication', description: 'Secure authentication technologies and procedures shall be established and implemented.', category: 'Technological Controls' },
      { controlId: 'A.8.7', title: 'Protection Against Malware', description: 'Protection against malware shall be implemented and supported by appropriate user awareness.', category: 'Technological Controls' },
      { controlId: 'A.8.8', title: 'Management of Technical Vulnerabilities', description: 'Information about technical vulnerabilities of information systems shall be obtained and appropriate measures taken.', category: 'Technological Controls' },
      { controlId: 'A.8.9', title: 'Configuration Management', description: 'Configurations, including security configurations, of hardware, software, services and networks shall be managed.', category: 'Technological Controls' },
      { controlId: 'A.8.12', title: 'Data Leakage Prevention', description: 'Data leakage prevention measures shall be applied to systems, networks and any other devices that process, store or transmit sensitive information.', category: 'Technological Controls' },
      { controlId: 'A.8.15', title: 'Logging', description: 'Logs that record activities, exceptions, faults and other relevant events shall be produced, stored, protected and analyzed.', category: 'Technological Controls' },
      { controlId: 'A.8.16', title: 'Monitoring Activities', description: 'Networks, systems and applications shall be monitored for anomalous behaviour.', category: 'Technological Controls' },
      { controlId: 'A.8.20', title: 'Networks Security', description: 'Networks and network devices shall be secured, managed and controlled to protect information.', category: 'Technological Controls' },
      { controlId: 'A.8.24', title: 'Use of Cryptography', description: 'Rules for the effective use of cryptography, including cryptographic key management, shall be defined.', category: 'Technological Controls' },
      { controlId: 'A.8.25', title: 'Secure Development Life Cycle', description: 'Rules for the secure development of software and systems shall be established and applied.', category: 'Technological Controls' },
      { controlId: 'A.8.28', title: 'Secure Coding', description: 'Secure coding principles shall be applied to software development.', category: 'Technological Controls' },
    ],
  },
]

async function seedCompliance() {
  console.log('Seeding compliance frameworks...')

  for (const fw of frameworks) {
    const existing = await prisma.complianceFramework.findUnique({
      where: { shortCode: fw.shortCode },
    })

    if (existing) {
      console.log(`  Framework "${fw.name}" already exists, skipping`)
      continue
    }

    await prisma.complianceFramework.create({
      data: {
        name: fw.name,
        version: fw.version,
        shortCode: fw.shortCode,
        controls: {
          create: fw.controls,
        },
      },
    })
    console.log(`  Created "${fw.name}" with ${fw.controls.length} controls`)
  }

  console.log('Compliance seed complete')
}

seedCompliance()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
