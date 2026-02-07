import { docxExportService } from '../docxExportService.js'
import { mockPrisma } from '../../__mocks__/prisma.js'

const fakeProject = {
  id: 'p1',
  name: 'Test Project',
  clientName: 'Acme Corp',
  assessmentType: 'PENETRATION_TEST',
  status: 'IN_PROGRESS',
  startDate: new Date('2024-01-15'),
  endDate: null,
  scope: 'Web application',
  findings: [{
    id: 'f1',
    title: 'SQL Injection',
    description: 'Found SQL injection in login',
    remediation: 'Use parameterized queries',
    severity: 'HIGH',
    status: 'NEW',
    cvssScore: 8.5,
    cveId: 'CVE-2021-12345',
    affectedSystems: ['web-server-1'],
    projectId: 'p1',
    createdAt: new Date(),
    updatedAt: new Date(),
  }],
  iocs: [{
    id: 'ioc1',
    type: 'IP_ADDRESS',
    value: '192.168.1.100',
    timestamp: new Date(),
  }],
  ttpMappings: [],
  creator: { name: 'Test User' },
}

describe('docxExportService.exportReport', () => {
  it('returns a Buffer for a project with findings', async () => {
    mockPrisma.project.findUnique.mockResolvedValueOnce(fakeProject)

    const result = await docxExportService.exportReport('p1')

    expect(Buffer.isBuffer(result)).toBe(true)
  })

  it('returned Buffer is non-empty', async () => {
    mockPrisma.project.findUnique.mockResolvedValueOnce(fakeProject)

    const result = await docxExportService.exportReport('p1')

    expect(result.length).toBeGreaterThan(0)
  })

  it('throws "Project not found" when project is null', async () => {
    mockPrisma.project.findUnique.mockResolvedValueOnce(null)

    await expect(docxExportService.exportReport('nonexistent')).rejects.toThrow('Project not found')
  })

  it('handles project with zero findings', async () => {
    mockPrisma.project.findUnique.mockResolvedValueOnce({
      ...fakeProject,
      findings: [],
    })

    const result = await docxExportService.exportReport('p1')

    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })
})
