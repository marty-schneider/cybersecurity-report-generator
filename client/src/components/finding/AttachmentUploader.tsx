import { useState, useRef } from 'react'
import { attachmentService } from '../../services/attachmentService'
import { Attachment } from '../../types'
import Button from '../common/Button'
import { notify } from '../../store/notificationStore'

interface AttachmentUploaderProps {
  findingId: string
  onUpload: (attachment: Attachment) => void
}

export default function AttachmentUploader({ findingId, onUpload }: AttachmentUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [caption, setCaption] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      notify.error('File size must be under 10MB')
      return
    }
    try {
      setUploading(true)
      const attachment = await attachmentService.upload(findingId, file, caption || undefined)
      onUpload(attachment)
      setCaption('')
      notify.success(`Uploaded ${file.name}`)
    } catch {
      notify.error('Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      handleFile(e.target.files[0])
    }
  }

  return (
    <div className="space-y-2">
      <div
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
          dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleInputChange}
          accept="image/*,.pdf,.txt,.csv,.log,.pcap,.json"
        />
        {uploading ? (
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">Uploading...</span>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-600">Drop a file here or click to upload</p>
            <p className="text-xs text-gray-400 mt-1">Images, PDF, text, CSV, log, pcap (max 10MB)</p>
          </div>
        )}
      </div>
      <input
        type="text"
        className="input py-1 text-sm"
        placeholder="Caption (optional)"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
      />
    </div>
  )
}
