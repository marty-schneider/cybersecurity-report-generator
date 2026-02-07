import apiClient from './apiClient'

function downloadBlob(data: Blob, filename: string) {
  const url = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export const exportService = {
  async exportCSV(projectId: string, entity: 'findings' | 'iocs' = 'findings'): Promise<void> {
    const res = await apiClient.get(`/export/csv/${projectId}?entity=${entity}`, { responseType: 'blob' })
    const filename = res.headers['content-disposition']?.match(/filename="(.+)"/)?.[1] || `${entity}.csv`
    downloadBlob(res.data, filename)
  },

  async exportJSON(projectId: string): Promise<void> {
    const res = await apiClient.get(`/export/json/${projectId}`, { responseType: 'blob' })
    const filename = res.headers['content-disposition']?.match(/filename="(.+)"/)?.[1] || 'export.json'
    downloadBlob(res.data, filename)
  },

  async exportHTML(projectId: string): Promise<void> {
    const res = await apiClient.get(`/export/html/${projectId}`, { responseType: 'blob' })
    const filename = res.headers['content-disposition']?.match(/filename="(.+)"/)?.[1] || 'report.html'
    downloadBlob(res.data, filename)
  },

  async exportDOCX(projectId: string): Promise<void> {
    const res = await apiClient.get(`/export/docx/${projectId}`, { responseType: 'blob' })
    const filename = res.headers['content-disposition']?.match(/filename="(.+)"/)?.[1] || 'report.docx'
    downloadBlob(res.data, filename)
  },
}
