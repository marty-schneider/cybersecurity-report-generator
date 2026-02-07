import { jsonExportService } from '../jsonExportService.js'
import { mockPrisma } from '../../__mocks__/prisma.js'

const fakeProject = {
  id: 'p1',
  name: 'Test Project',
  clientName: 'Acme Corp',
  findings: [{ id: 'f1', title: 'SQL Injection', remediationNotes: [], complianceMappings: [] }],
  iocs: [{ id: 'ioc1', type: 'IP_ADDRESS', value: '1.2.3.4' }],
  ttpMappings: [],
  creator: { name: 'Test User', email: 'test@example.com' },
  members: [],
}

describe('jsonExportService.exportProject', () => {
  it('returns valid JSON string for a project', async () => {
    mockPrisma.project.findUnique.mockResolvedValueOnce(fakeProject)

    const json = await jsonExportService.exportProject('p1')
    const parsed = JSON.parse(json)

    expect(parsed.id).toBe('p1')
    expect(parsed.name).toBe('Test Project')
  })

  it('throws "Project not found" when project is null', async () => {
    mockPrisma.project.findUnique.mockResolvedValueOnce(null)

    await expect(jsonExportService.exportProject('nonexistent')).rejects.toThrow('Project not found')
  })

  it('includes findings, iocs, and creator', async () => {
    mockPrisma.project.findUnique.mockResolvedValueOnce(fakeProject)

    const json = await jsonExportService.exportProject('p1')
    const parsed = JSON.parse(json)

    expect(parsed.findings).toHaveLength(1)
    expect(parsed.iocs).toHaveLength(1)
    expect(parsed.creator.name).toBe('Test User')
  })
})
