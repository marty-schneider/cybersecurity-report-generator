import { vi } from 'vitest'
import { exportCSV, exportJSON, exportHTML, exportDOCX } from '../exportController.js'
import { mockRequest, mockResponse, mockNext } from '../../__tests__/helpers/express.js'
import { mockPrisma } from '../../__mocks__/prisma.js'

// Mock services
vi.mock('../../services/csvExportService.js', () => ({
  csvExportService: {
    exportFindings: vi.fn().mockResolvedValue('id,title\nf1,Test'),
    exportIOCs: vi.fn().mockResolvedValue('id,type\nioc1,IP'),
  },
}))
vi.mock('../../services/jsonExportService.js', () => ({
  jsonExportService: {
    exportProject: vi.fn().mockResolvedValue('{"id":"p1"}'),
  },
}))
vi.mock('../../services/docxExportService.js', () => ({
  docxExportService: {
    exportReport: vi.fn().mockResolvedValue(Buffer.from('docx-content')),
  },
}))
vi.mock('../../services/reportGenerationService.js', () => ({
  reportGenerationService: {
    generateReport: vi.fn().mockResolvedValue('<html>Report</html>'),
  },
}))
vi.mock('../../middleware/projectAccess.js', () => ({
  verifyProjectAccess: vi.fn().mockResolvedValue({}),
}))

describe('exportCSV', () => {
  it('sets Content-Type to text/csv', async () => {
    const req = mockRequest({ params: { projectId: 'p1' }, query: {} })
    const res = mockResponse()
    const next = mockNext()

    mockPrisma.project.findUnique.mockResolvedValueOnce({ name: 'Test Project' })

    await exportCSV(req, res, next)

    expect(res._headers['Content-Type']).toBe('text/csv')
    expect(res._headers['Content-Disposition']).toContain('.csv')
  })

  it('exports IOCs when entity=iocs', async () => {
    const { csvExportService } = await import('../../services/csvExportService.js')
    const req = mockRequest({ params: { projectId: 'p1' }, query: { entity: 'iocs' } })
    const res = mockResponse()
    const next = mockNext()

    mockPrisma.project.findUnique.mockResolvedValueOnce({ name: 'Test' })

    await exportCSV(req, res, next)

    expect(csvExportService.exportIOCs).toHaveBeenCalledWith('p1')
  })

  it('sanitizes project name in filename', async () => {
    const req = mockRequest({ params: { projectId: 'p1' }, query: {} })
    const res = mockResponse()
    const next = mockNext()

    mockPrisma.project.findUnique.mockResolvedValueOnce({ name: 'My Project (Test)' })

    await exportCSV(req, res, next)

    expect(res._headers['Content-Disposition']).toContain('My_Project__Test_')
  })
})

describe('exportJSON', () => {
  it('sets Content-Type to application/json', async () => {
    const req = mockRequest({ params: { projectId: 'p1' } })
    const res = mockResponse()
    const next = mockNext()

    mockPrisma.project.findUnique.mockResolvedValueOnce({ name: 'Test' })

    await exportJSON(req, res, next)

    expect(res._headers['Content-Type']).toBe('application/json')
    expect(res._headers['Content-Disposition']).toContain('_export.json')
  })
})

describe('exportDOCX', () => {
  it('sets Content-Type for DOCX', async () => {
    const req = mockRequest({ params: { projectId: 'p1' } })
    const res = mockResponse()
    const next = mockNext()

    mockPrisma.project.findUnique.mockResolvedValueOnce({ name: 'Test' })

    await exportDOCX(req, res, next)

    expect(res._headers['Content-Type']).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
    expect(res._headers['Content-Disposition']).toContain('_report.docx')
  })
})
