import { csvExportService } from '../csvExportService.js'
import { mockPrisma } from '../../__mocks__/prisma.js'

const makeFinding = (overrides: Record<string, unknown> = {}) => ({
  id: 'f1',
  title: 'SQL Injection',
  severity: 'HIGH',
  status: 'NEW',
  cvssScore: 8.5,
  cveId: 'CVE-2021-12345',
  affectedSystems: ['web-server-1', 'db-server'],
  description: 'SQL injection in login form',
  remediation: 'Use parameterized queries',
  createdAt: new Date('2024-01-15T10:00:00Z'),
  ...overrides,
})

const makeIOC = (overrides: Record<string, unknown> = {}) => ({
  id: 'ioc1',
  type: 'IP_ADDRESS',
  value: '192.168.1.100',
  timestamp: new Date('2024-01-15T10:00:00Z'),
  context: 'Scanning activity',
  source: 'IDS logs',
  createdAt: new Date('2024-01-15T10:00:00Z'),
  ...overrides,
})

describe('csvExportService.exportFindings', () => {
  it('returns CSV with correct header row', async () => {
    mockPrisma.finding.findMany.mockResolvedValueOnce([])

    const csv = await csvExportService.exportFindings('p1')
    const header = csv.split('\n')[0]

    expect(header).toBe('ID,Title,Severity,Status,CVSS Score,CVE ID,Affected Systems,Description,Remediation,Created At')
  })

  it('returns correct CSV data for findings', async () => {
    mockPrisma.finding.findMany.mockResolvedValueOnce([makeFinding()])

    const csv = await csvExportService.exportFindings('p1')
    const lines = csv.split('\n')

    expect(lines).toHaveLength(2)
    expect(lines[1]).toContain('f1')
    expect(lines[1]).toContain('SQL Injection')
    expect(lines[1]).toContain('HIGH')
    expect(lines[1]).toContain('8.5')
  })

  it('handles comma in title (wraps in quotes)', async () => {
    mockPrisma.finding.findMany.mockResolvedValueOnce([
      makeFinding({ title: 'XSS, Reflected' }),
    ])

    const csv = await csvExportService.exportFindings('p1')

    expect(csv).toContain('"XSS, Reflected"')
  })

  it('handles double quotes in description (escapes with "")', async () => {
    mockPrisma.finding.findMany.mockResolvedValueOnce([
      makeFinding({ description: 'Found "dangerous" input' }),
    ])

    const csv = await csvExportService.exportFindings('p1')

    expect(csv).toContain('"Found ""dangerous"" input"')
  })

  it('handles null cvssScore and cveId', async () => {
    mockPrisma.finding.findMany.mockResolvedValueOnce([
      makeFinding({ cvssScore: null, cveId: null }),
    ])

    const csv = await csvExportService.exportFindings('p1')
    const dataRow = csv.split('\n')[1]

    // Null values should be empty strings in CSV
    expect(dataRow).toContain(',,')
  })

  it('returns header-only when no findings', async () => {
    mockPrisma.finding.findMany.mockResolvedValueOnce([])

    const csv = await csvExportService.exportFindings('p1')
    const lines = csv.split('\n')

    expect(lines).toHaveLength(1) // header only
  })
})

describe('csvExportService.exportIOCs', () => {
  it('returns CSV with correct header and data', async () => {
    mockPrisma.iOC.findMany.mockResolvedValueOnce([makeIOC()])

    const csv = await csvExportService.exportIOCs('p1')
    const lines = csv.split('\n')

    expect(lines[0]).toBe('ID,Type,Value,Timestamp,Context,Source,Created At')
    expect(lines).toHaveLength(2)
    expect(lines[1]).toContain('192.168.1.100')
  })
})
