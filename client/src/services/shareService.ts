import apiClient from './apiClient'

export interface ShareLinkResponse {
  id: string
  token: string
  expiresAt: string
  maxViews?: number
  hasPassword: boolean
  url: string
}

export interface ShareLinkInfo {
  id: string
  token: string
  expiresAt: string
  maxViews?: number
  viewCount: number
  isActive: boolean
  isExpired: boolean
  hasPassword: boolean
  url: string
  createdAt: string
}

export const shareService = {
  async createLink(reportId: string, options?: {
    password?: string
    expiresInDays?: number
    maxViews?: number
  }): Promise<ShareLinkResponse> {
    const res = await apiClient.post('/share', { reportId, ...options })
    return res.data
  },

  async revokeLink(id: string): Promise<void> {
    await apiClient.delete(`/share/${id}`)
  },

  async listLinks(reportId: string): Promise<ShareLinkInfo[]> {
    const res = await apiClient.get(`/share/report/${reportId}/links`)
    return res.data
  },

  async viewShared(token: string): Promise<{ html: string; projectName: string }> {
    const res = await apiClient.get(`/share/view/${token}`)
    return res.data
  },

  async verifyAndView(token: string, password: string): Promise<{ html: string; projectName: string }> {
    const res = await apiClient.post(`/share/view/${token}/verify`, { password })
    return res.data
  },
}
