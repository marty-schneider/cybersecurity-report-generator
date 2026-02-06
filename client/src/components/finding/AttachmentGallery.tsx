import { useState } from 'react'
import { attachmentService } from '../../services/attachmentService'
import { Attachment } from '../../types'
import { notify } from '../../store/notificationStore'

interface AttachmentGalleryProps {
  findingId: string
  attachments: Attachment[]
  onDelete: (id: string) => void
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isImage(fileType: string): boolean {
  return fileType.startsWith('image/')
}

export default function AttachmentGallery({ findingId, attachments, onDelete }: AttachmentGalleryProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this attachment?')) return
    try {
      await attachmentService.delete(id)
      onDelete(id)
      notify.success('Attachment deleted')
    } catch {
      notify.error('Failed to delete attachment')
    }
  }

  if (attachments.length === 0) {
    return <p className="text-sm text-gray-400">No attachments yet.</p>
  }

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {attachments.map((att) => (
          <div key={att.id} className="border border-gray-200 rounded-lg p-2 group relative">
            {isImage(att.fileType) ? (
              <img
                src={attachmentService.getUrl(att.id)}
                alt={att.fileName}
                className="w-full h-24 object-cover rounded cursor-pointer"
                onClick={() => setPreviewUrl(attachmentService.getUrl(att.id))}
              />
            ) : (
              <div
                className="w-full h-24 bg-gray-100 rounded flex items-center justify-center cursor-pointer"
                onClick={() => window.open(attachmentService.getUrl(att.id), '_blank')}
              >
                <span className="text-2xl">
                  {att.fileType.includes('pdf') ? '📄' : att.fileType.includes('text') ? '📝' : '📎'}
                </span>
              </div>
            )}
            <div className="mt-1">
              <p className="text-xs text-gray-700 truncate" title={att.fileName}>{att.fileName}</p>
              <p className="text-xs text-gray-400">{formatFileSize(att.fileSize)}</p>
              {att.caption && <p className="text-xs text-gray-500 italic truncate">{att.caption}</p>}
            </div>
            <button
              onClick={() => handleDelete(att.id)}
              className="absolute top-1 right-1 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
              title="Delete"
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {previewUrl && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="max-w-4xl max-h-[90vh] p-4">
            <img src={previewUrl} alt="Preview" className="max-w-full max-h-[85vh] object-contain" />
          </div>
        </div>
      )}
    </div>
  )
}
