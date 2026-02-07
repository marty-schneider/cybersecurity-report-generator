import apiClient from './apiClient'
import { Attachment } from '../types'

export const attachmentService = {
  async upload(findingId: string, file: File, caption?: string): Promise<Attachment> {
    const formData = new FormData()
    formData.append('file', file)
    if (caption) formData.append('caption', caption)

    const response = await apiClient.post<Attachment>(
      `/attachments/${findingId}/upload`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return response.data
  },

  async list(findingId: string): Promise<Attachment[]> {
    const response = await apiClient.get<Attachment[]>(`/attachments/finding/${findingId}`)
    return response.data
  },

  getUrl(id: string): string {
    return `${apiClient.defaults.baseURL}/attachments/${id}`
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/attachments/${id}`)
  },
}
