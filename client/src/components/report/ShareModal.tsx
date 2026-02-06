import { useState, useEffect } from 'react'
import Modal from '../common/Modal'
import Button from '../common/Button'
import { shareService, ShareLinkInfo } from '../../services/shareService'
import { notify } from '../../store/notificationStore'

interface Props {
  isOpen: boolean
  onClose: () => void
  reportId: string
}

export default function ShareModal({ isOpen, onClose, reportId }: Props) {
  const [links, setLinks] = useState<ShareLinkInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [password, setPassword] = useState('')
  const [expiresInDays, setExpiresInDays] = useState(7)
  const [maxViews, setMaxViews] = useState('')
  const [createdUrl, setCreatedUrl] = useState('')

  useEffect(() => {
    if (isOpen && reportId) {
      loadLinks()
    }
  }, [isOpen, reportId])

  const loadLinks = async () => {
    try {
      const data = await shareService.listLinks(reportId)
      setLinks(data)
    } catch {
      // Ignore
    }
  }

  const handleCreate = async () => {
    try {
      setLoading(true)
      const result = await shareService.createLink(reportId, {
        password: password || undefined,
        expiresInDays,
        maxViews: maxViews ? parseInt(maxViews) : undefined,
      })
      const fullUrl = `${window.location.origin}/shared/${result.token}`
      setCreatedUrl(fullUrl)
      await navigator.clipboard.writeText(fullUrl).catch(() => {})
      notify.success('Share link created and copied!')
      setPassword('')
      setMaxViews('')
      await loadLinks()
    } catch {
      notify.error('Failed to create share link')
    } finally {
      setLoading(false)
    }
  }

  const handleRevoke = async (id: string) => {
    try {
      await shareService.revokeLink(id)
      notify.success('Link revoked')
      setLinks(prev => prev.map(l => l.id === id ? { ...l, isActive: false } : l))
    } catch {
      notify.error('Failed to revoke link')
    }
  }

  const copyUrl = (token: string) => {
    const url = `${window.location.origin}/shared/${token}`
    navigator.clipboard.writeText(url).catch(() => {})
    notify.success('Link copied!')
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share Report">
      <div className="space-y-6">
        {/* Create new link */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">Create Share Link</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Password (optional)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                placeholder="Leave empty for no password"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Expires in (days)</label>
              <input
                type="number"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 7)}
                min={1}
                max={365}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Max views (optional)</label>
            <input
              type="number"
              value={maxViews}
              onChange={(e) => setMaxViews(e.target.value)}
              min={1}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              placeholder="Unlimited"
            />
          </div>
          <Button onClick={handleCreate} disabled={loading}>
            {loading ? 'Creating...' : 'Create Link'}
          </Button>

          {createdUrl && (
            <div className="bg-green-50 border border-green-200 rounded p-3">
              <p className="text-xs text-green-700 mb-1">Link created and copied to clipboard:</p>
              <code className="text-xs text-green-800 break-all">{createdUrl}</code>
            </div>
          )}
        </div>

        {/* Existing links */}
        {links.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Existing Links</h3>
            <div className="space-y-2">
              {links.map(link => (
                <div key={link.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        !link.isActive ? 'bg-red-100 text-red-600'
                          : link.isExpired ? 'bg-yellow-100 text-yellow-600'
                            : 'bg-green-100 text-green-600'
                      }`}>
                        {!link.isActive ? 'Revoked' : link.isExpired ? 'Expired' : 'Active'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {link.viewCount} views
                        {link.maxViews ? ` / ${link.maxViews} max` : ''}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Expires: {new Date(link.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-1 ml-2">
                    {link.isActive && !link.isExpired && (
                      <>
                        <button
                          onClick={() => copyUrl(link.token)}
                          className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                        >
                          Copy
                        </button>
                        <button
                          onClick={() => handleRevoke(link.id)}
                          className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
                        >
                          Revoke
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
