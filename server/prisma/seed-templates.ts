import { PrismaClient, Severity } from '@prisma/client'

const prisma = new PrismaClient()

interface TemplateData {
  title: string
  description: string
  severity: Severity
  cvssScore?: number
  category: string
  remediation: string
  references: string[]
  tags: string[]
}

const TEMPLATES: TemplateData[] = [
  // Web Application
  {
    title: 'SQL Injection',
    description: 'The application is vulnerable to SQL injection attacks. User-supplied input is incorporated into SQL queries without proper sanitization or parameterization, allowing an attacker to manipulate database queries.',
    severity: 'CRITICAL',
    cvssScore: 9.8,
    category: 'Web Application',
    remediation: 'Use parameterized queries or prepared statements for all database interactions. Implement input validation and use an ORM where possible. Apply the principle of least privilege to database accounts.',
    references: ['https://owasp.org/www-community/attacks/SQL_Injection', 'CWE-89'],
    tags: ['owasp-top-10', 'injection', 'database'],
  },
  {
    title: 'Cross-Site Scripting (XSS) - Reflected',
    description: 'The application reflects user-supplied input in HTTP responses without proper encoding or sanitization, allowing execution of arbitrary JavaScript in the context of a victim user\'s browser session.',
    severity: 'HIGH',
    cvssScore: 7.1,
    category: 'Web Application',
    remediation: 'Implement context-aware output encoding for all user-supplied data. Use Content Security Policy (CSP) headers. Validate and sanitize input on the server side.',
    references: ['https://owasp.org/www-community/attacks/xss/', 'CWE-79'],
    tags: ['owasp-top-10', 'xss', 'injection'],
  },
  {
    title: 'Cross-Site Scripting (XSS) - Stored',
    description: 'The application stores user-supplied input and later renders it in pages served to other users without proper encoding, enabling persistent cross-site scripting attacks.',
    severity: 'HIGH',
    cvssScore: 8.1,
    category: 'Web Application',
    remediation: 'Sanitize all user input before storage. Implement context-aware output encoding when rendering stored data. Deploy Content Security Policy headers.',
    references: ['https://owasp.org/www-community/attacks/xss/', 'CWE-79'],
    tags: ['owasp-top-10', 'xss', 'stored'],
  },
  {
    title: 'Insecure Direct Object Reference (IDOR)',
    description: 'The application exposes internal object references (e.g., database IDs) in URLs or parameters without proper authorization checks, allowing users to access resources belonging to other users.',
    severity: 'HIGH',
    cvssScore: 7.5,
    category: 'Web Application',
    remediation: 'Implement proper authorization checks for every resource access. Use indirect references or UUIDs. Validate that the authenticated user has permission to access the requested resource.',
    references: ['https://owasp.org/www-project-web-security-testing-guide/', 'CWE-639'],
    tags: ['owasp-top-10', 'access-control', 'authorization'],
  },
  {
    title: 'Cross-Site Request Forgery (CSRF)',
    description: 'The application does not implement CSRF protection, allowing attackers to craft malicious pages that perform state-changing actions on behalf of authenticated users.',
    severity: 'MEDIUM',
    cvssScore: 6.5,
    category: 'Web Application',
    remediation: 'Implement anti-CSRF tokens for all state-changing requests. Use the SameSite cookie attribute. Verify the Origin and Referer headers.',
    references: ['https://owasp.org/www-community/attacks/csrf', 'CWE-352'],
    tags: ['owasp-top-10', 'csrf'],
  },
  {
    title: 'Server-Side Request Forgery (SSRF)',
    description: 'The application fetches resources from URLs supplied by users without proper validation, allowing attackers to make requests to internal services or read sensitive data.',
    severity: 'HIGH',
    cvssScore: 8.6,
    category: 'Web Application',
    remediation: 'Validate and sanitize all user-supplied URLs. Use allowlists for permitted domains. Block requests to internal IP ranges (10.x, 172.16.x, 192.168.x, 127.x). Disable unnecessary URL schemes.',
    references: ['https://owasp.org/Top10/A10_2021-Server-Side_Request_Forgery_%28SSRF%29/', 'CWE-918'],
    tags: ['owasp-top-10', 'ssrf'],
  },
  // Authentication
  {
    title: 'Weak Password Policy',
    description: 'The application allows users to set weak passwords that do not meet minimum complexity requirements, making accounts susceptible to brute-force and credential stuffing attacks.',
    severity: 'MEDIUM',
    cvssScore: 5.3,
    category: 'Authentication',
    remediation: 'Enforce minimum password length of 12 characters. Require a mix of character types. Check against known breached password lists. Implement account lockout after failed attempts.',
    references: ['https://pages.nist.gov/800-63-3/sp800-63b.html', 'CWE-521'],
    tags: ['authentication', 'password', 'brute-force'],
  },
  {
    title: 'Missing Multi-Factor Authentication',
    description: 'The application relies solely on password-based authentication without offering multi-factor authentication (MFA), increasing risk of account compromise through credential theft.',
    severity: 'MEDIUM',
    cvssScore: 5.9,
    category: 'Authentication',
    remediation: 'Implement MFA using TOTP (e.g., Google Authenticator), hardware security keys (WebAuthn/FIDO2), or push notifications. Enforce MFA for privileged accounts.',
    references: ['https://pages.nist.gov/800-63-3/sp800-63b.html', 'CWE-308'],
    tags: ['authentication', 'mfa', 'access-control'],
  },
  {
    title: 'Session Fixation',
    description: 'The application does not regenerate session identifiers after authentication, allowing an attacker who knows a pre-authentication session ID to hijack the authenticated session.',
    severity: 'HIGH',
    cvssScore: 7.5,
    category: 'Authentication',
    remediation: 'Regenerate session IDs after successful authentication. Invalidate old session tokens. Set secure cookie attributes (HttpOnly, Secure, SameSite).',
    references: ['https://owasp.org/www-community/attacks/Session_fixation', 'CWE-384'],
    tags: ['authentication', 'session', 'hijacking'],
  },
  // Network
  {
    title: 'Unencrypted Communication (Missing TLS)',
    description: 'Sensitive data is transmitted over unencrypted HTTP connections, allowing attackers on the network to intercept credentials, session tokens, and other sensitive information.',
    severity: 'HIGH',
    cvssScore: 7.4,
    category: 'Network',
    remediation: 'Enforce HTTPS for all communications. Implement HTTP Strict Transport Security (HSTS). Use TLS 1.2 or higher. Redirect all HTTP requests to HTTPS.',
    references: ['CWE-319'],
    tags: ['network', 'encryption', 'tls'],
  },
  {
    title: 'Outdated TLS Configuration',
    description: 'The server supports deprecated TLS versions (TLS 1.0, TLS 1.1) or weak cipher suites, making encrypted communications vulnerable to downgrade attacks.',
    severity: 'MEDIUM',
    cvssScore: 5.9,
    category: 'Network',
    remediation: 'Disable TLS 1.0 and 1.1. Configure TLS 1.2+ with strong cipher suites. Disable RC4, DES, and 3DES ciphers. Enable Perfect Forward Secrecy (PFS).',
    references: ['CWE-327'],
    tags: ['network', 'tls', 'cryptography'],
  },
  {
    title: 'Open Ports and Unnecessary Services',
    description: 'Network scanning revealed open ports running services that are not required for business operations, increasing the attack surface.',
    severity: 'LOW',
    cvssScore: 3.7,
    category: 'Network',
    remediation: 'Close unnecessary ports and disable unused services. Implement network segmentation. Use host-based firewalls. Document all required services and ports.',
    references: ['CWE-200'],
    tags: ['network', 'hardening', 'attack-surface'],
  },
  // Cloud
  {
    title: 'Publicly Accessible S3 Bucket',
    description: 'An Amazon S3 bucket is configured with public access, potentially exposing sensitive data to unauthorized users on the internet.',
    severity: 'CRITICAL',
    cvssScore: 9.1,
    category: 'Cloud',
    remediation: 'Enable S3 Block Public Access at the account level. Review and restrict bucket policies and ACLs. Enable S3 access logging. Use AWS Config rules to detect public buckets.',
    references: ['CWE-284'],
    tags: ['cloud', 'aws', 's3', 'misconfiguration'],
  },
  {
    title: 'Overly Permissive IAM Policy',
    description: 'IAM roles or users are granted excessive permissions (e.g., wildcard actions or resources), violating the principle of least privilege.',
    severity: 'HIGH',
    cvssScore: 8.1,
    category: 'Cloud',
    remediation: 'Apply least-privilege IAM policies. Use IAM Access Analyzer to identify unused permissions. Implement service control policies. Regular access reviews.',
    references: ['CWE-269'],
    tags: ['cloud', 'aws', 'iam', 'access-control'],
  },
  // Configuration
  {
    title: 'Security Headers Missing',
    description: 'The application does not set recommended security headers (Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, etc.), reducing defense-in-depth protections.',
    severity: 'LOW',
    cvssScore: 4.3,
    category: 'Configuration',
    remediation: 'Implement security headers: Content-Security-Policy, X-Frame-Options (DENY), X-Content-Type-Options (nosniff), Referrer-Policy, Permissions-Policy. Use a web application firewall.',
    references: ['https://owasp.org/www-project-secure-headers/', 'CWE-693'],
    tags: ['configuration', 'headers', 'hardening'],
  },
  {
    title: 'Default Credentials in Use',
    description: 'System or application components are using default or factory-set credentials, allowing trivial unauthorized access.',
    severity: 'CRITICAL',
    cvssScore: 9.8,
    category: 'Configuration',
    remediation: 'Change all default credentials immediately. Implement a credential management policy. Use unique, strong passwords for all service accounts. Document all accounts requiring credential changes.',
    references: ['CWE-798'],
    tags: ['configuration', 'credentials', 'default'],
  },
  {
    title: 'Verbose Error Messages',
    description: 'The application returns detailed error messages including stack traces, database queries, or internal paths, which can aid attackers in understanding the application architecture.',
    severity: 'LOW',
    cvssScore: 3.7,
    category: 'Configuration',
    remediation: 'Implement custom error pages. Log detailed errors server-side only. Return generic error messages to users. Disable debug mode in production.',
    references: ['CWE-209'],
    tags: ['configuration', 'information-disclosure'],
  },
  // Cryptography
  {
    title: 'Weak Cryptographic Algorithm',
    description: 'The application uses deprecated or weak cryptographic algorithms (MD5, SHA-1, DES) for security-sensitive operations like password hashing or data encryption.',
    severity: 'HIGH',
    cvssScore: 7.5,
    category: 'Cryptography',
    remediation: 'Replace MD5/SHA-1 with SHA-256 or SHA-3 for hashing. Use bcrypt, scrypt, or Argon2 for password hashing. Replace DES/3DES with AES-256. Implement proper key management.',
    references: ['CWE-327'],
    tags: ['cryptography', 'hashing', 'encryption'],
  },
  {
    title: 'Hardcoded Secrets in Source Code',
    description: 'Sensitive credentials, API keys, or cryptographic keys are hardcoded in the application source code, risking exposure through source code leaks or repository access.',
    severity: 'HIGH',
    cvssScore: 7.5,
    category: 'Cryptography',
    remediation: 'Remove all hardcoded secrets from source code. Use environment variables or a secrets management service (e.g., HashiCorp Vault, AWS Secrets Manager). Rotate all exposed credentials.',
    references: ['CWE-798'],
    tags: ['cryptography', 'secrets', 'source-code'],
  },
  // Data Protection
  {
    title: 'Sensitive Data Exposure in Logs',
    description: 'The application logs sensitive information such as passwords, tokens, PII, or credit card numbers, which could be accessed by unauthorized personnel or through log aggregation services.',
    severity: 'MEDIUM',
    cvssScore: 5.5,
    category: 'Data Protection',
    remediation: 'Implement log scrubbing to remove sensitive data. Use structured logging with explicit field selection. Review log retention policies. Restrict log access to authorized personnel.',
    references: ['CWE-532'],
    tags: ['data-protection', 'logging', 'pii'],
  },
]

async function seedTemplates() {
  console.log('Seeding finding templates...')

  const existing = await prisma.findingTemplate.count({ where: { isBuiltIn: true } })
  if (existing > 0) {
    console.log(`Found ${existing} existing built-in templates. Skipping seed.`)
    return
  }

  for (const t of TEMPLATES) {
    await prisma.findingTemplate.create({
      data: { ...t, isBuiltIn: true },
    })
  }

  console.log(`Seeded ${TEMPLATES.length} built-in finding templates.`)
}

seedTemplates()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
  })
