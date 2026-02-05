import { IOC, IOCType } from '../../types'
import Modal from '../common/Modal'
import Button from '../common/Button'

const IOC_TYPE_OPTIONS: { value: IOCType; label: string }[] = [
  { value: 'IP_ADDRESS', label: 'IP Address' },
  { value: 'DOMAIN', label: 'Domain' },
  { value: 'URL', label: 'URL' },
  { value: 'FILE_HASH_MD5', label: 'File Hash (MD5)' },
  { value: 'FILE_HASH_SHA1', label: 'File Hash (SHA1)' },
  { value: 'FILE_HASH_SHA256', label: 'File Hash (SHA256)' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'CVE', label: 'CVE' },
  { value: 'REGISTRY_KEY', label: 'Registry Key' },
  { value: 'MUTEX', label: 'Mutex' },
  { value: 'USER_AGENT', label: 'User Agent' },
  { value: 'CERTIFICATE', label: 'Certificate' },
  { value: 'FILE_PATH', label: 'File Path' },
  { value: 'COMMAND_LINE', label: 'Command Line' },
]

interface IOCFormData {
  type: IOCType
  value: string
  timestamp: string
  context: string
  source: string
}

interface IOCFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  editingIOC: IOC | null
  formData: IOCFormData
  setFormData: (data: IOCFormData) => void
}

export default function IOCFormModal({
  isOpen,
  onClose,
  onSubmit,
  editingIOC,
  formData,
  setFormData,
}: IOCFormModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingIOC ? 'Edit Indicator of Compromise' : 'Add Indicator of Compromise'}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label">IOC Type</label>
          <select
            className="input"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as IOCType })}
          >
            {IOC_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Value</label>
          <input
            type="text"
            required
            className="input"
            placeholder="e.g., 192.168.1.100, malicious.com"
            value={formData.value}
            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
          />
        </div>

        <div>
          <label className="label">Timestamp</label>
          <input
            type="datetime-local"
            required
            className="input"
            value={formData.timestamp}
            onChange={(e) => setFormData({ ...formData, timestamp: e.target.value })}
          />
        </div>

        <div>
          <label className="label">Context (Optional)</label>
          <textarea
            className="input"
            rows={3}
            placeholder="Additional context about this IOC..."
            value={formData.context}
            onChange={(e) => setFormData({ ...formData, context: e.target.value })}
          />
        </div>

        <div>
          <label className="label">Source (Optional)</label>
          <input
            type="text"
            className="input"
            placeholder="e.g., firewall logs, EDR alert"
            value={formData.source}
            onChange={(e) => setFormData({ ...formData, source: e.target.value })}
          />
        </div>

        <div className="flex gap-3">
          <Button type="submit" className="flex-1">
            {editingIOC ? 'Update IOC' : 'Add IOC'}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  )
}
