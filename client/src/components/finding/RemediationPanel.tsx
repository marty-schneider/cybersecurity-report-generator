import { useState } from 'react'
import { Finding, FindingStatus, RemediationNote } from '../../types'
import { remediationService } from '../../services/remediationService'
import { StatusBadge } from '../badges'
import Button from '../common/Button'
import { notify } from '../../store/notificationStore'

interface RemediationPanelProps {
  finding: Finding
  onUpdate: (updated: Finding) => void
}

const STATUS_OPTIONS: { value: FindingStatus; label: string }[] = [
  { value: 'NEW', label: 'New' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'REMEDIATION_PLANNED', label: 'Remediation Planned' },
  { value: 'RETEST_PENDING', label: 'Retest Pending' },
  { value: 'REMEDIATED', label: 'Remediated' },
  { value: 'ACCEPTED_RISK', label: 'Accepted Risk' },
  { value: 'MITIGATED', label: 'Mitigated' },
]

const VALID_TRANSITIONS: Record<string, FindingStatus[]> = {
  NEW: ['IN_REVIEW', 'ACCEPTED_RISK'],
  IN_REVIEW: ['VERIFIED', 'ACCEPTED_RISK', 'NEW'],
  VERIFIED: ['REMEDIATION_PLANNED', 'ACCEPTED_RISK'],
  REMEDIATION_PLANNED: ['RETEST_PENDING', 'VERIFIED'],
  RETEST_PENDING: ['REMEDIATED', 'REMEDIATION_PLANNED', 'VERIFIED'],
  REMEDIATED: ['MITIGATED', 'RETEST_PENDING'],
  ACCEPTED_RISK: ['IN_REVIEW'],
  MITIGATED: [],
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString()
}

export default function RemediationPanel({ finding, onUpdate }: RemediationPanelProps) {
  const [newStatus, setNewStatus] = useState<FindingStatus>(finding.status)
  const [targetDate, setTargetDate] = useState(finding.remediationTargetDate?.split('T')[0] || '')
  const [retestDate, setRetestDate] = useState(finding.retestDate?.split('T')[0] || '')
  const [riskNote, setRiskNote] = useState(finding.riskAcceptanceNote || '')
  const [noteText, setNoteText] = useState('')
  const [saving, setSaving] = useState(false)

  const allowedTransitions = VALID_TRANSITIONS[finding.status] || []

  const handleStatusUpdate = async () => {
    if (newStatus === finding.status && !targetDate && !retestDate) return
    try {
      setSaving(true)
      const data: Record<string, unknown> = {}
      if (newStatus !== finding.status) data.status = newStatus
      if (targetDate) data.remediationTargetDate = targetDate
      if (retestDate) data.retestDate = retestDate
      if (riskNote && newStatus === 'ACCEPTED_RISK') data.riskAcceptanceNote = riskNote
      if (newStatus === 'REMEDIATED') data.verifiedDate = new Date().toISOString()

      const updated = await remediationService.updateStatus(finding.id, data as any)
      onUpdate(updated)
      notify.success('Remediation status updated')
    } catch {
      notify.error('Failed to update remediation status')
    } finally {
      setSaving(false)
    }
  }

  const handleAddNote = async () => {
    if (!noteText.trim()) return
    try {
      const note = await remediationService.addNote(finding.id, noteText.trim())
      const updatedNotes = [note, ...(finding.remediationNotes || [])]
      onUpdate({ ...finding, remediationNotes: updatedNotes })
      setNoteText('')
      notify.success('Note added')
    } catch {
      notify.error('Failed to add note')
    }
  }

  return (
    <div className="space-y-4">
      {/* Current Status */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">Current Status:</span>
        <StatusBadge status={finding.status} />
      </div>

      {/* Status Transition */}
      {allowedTransitions.length > 0 && (
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Update Status</h4>
          <div className="flex gap-3 items-end flex-wrap">
            <div>
              <label className="text-xs text-gray-500">New Status</label>
              <select
                className="input py-1 text-sm"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as FindingStatus)}
              >
                <option value={finding.status}>{STATUS_OPTIONS.find(s => s.value === finding.status)?.label}</option>
                {allowedTransitions.map((s) => (
                  <option key={s} value={s}>{STATUS_OPTIONS.find(o => o.value === s)?.label || s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Target Date</label>
              <input
                type="date"
                className="input py-1 text-sm"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
            {(newStatus === 'RETEST_PENDING' || finding.status === 'RETEST_PENDING') && (
              <div>
                <label className="text-xs text-gray-500">Retest Date</label>
                <input
                  type="date"
                  className="input py-1 text-sm"
                  value={retestDate}
                  onChange={(e) => setRetestDate(e.target.value)}
                />
              </div>
            )}
            {newStatus === 'ACCEPTED_RISK' && (
              <div className="w-full">
                <label className="text-xs text-gray-500">Risk Acceptance Note</label>
                <textarea
                  className="input py-1 text-sm"
                  rows={2}
                  value={riskNote}
                  onChange={(e) => setRiskNote(e.target.value)}
                  placeholder="Justification for accepting this risk..."
                />
              </div>
            )}
            <Button onClick={handleStatusUpdate} disabled={saving || newStatus === finding.status}>
              {saving ? 'Saving...' : 'Update'}
            </Button>
          </div>
        </div>
      )}

      {/* Key Dates */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="text-sm">
          <span className="text-gray-500 block">Created</span>
          <span className="font-medium">{formatDate(finding.createdAt)}</span>
        </div>
        <div className="text-sm">
          <span className="text-gray-500 block">Target Date</span>
          <span className="font-medium">{formatDate(finding.remediationTargetDate)}</span>
        </div>
        <div className="text-sm">
          <span className="text-gray-500 block">Retest Date</span>
          <span className="font-medium">{formatDate(finding.retestDate)}</span>
        </div>
        <div className="text-sm">
          <span className="text-gray-500 block">Verified Date</span>
          <span className="font-medium">{formatDate(finding.verifiedDate)}</span>
        </div>
      </div>

      {/* Risk Acceptance Note */}
      {finding.riskAcceptanceNote && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <span className="text-xs font-medium text-amber-700 block mb-1">Risk Acceptance Note</span>
          <p className="text-sm text-amber-900">{finding.riskAcceptanceNote}</p>
        </div>
      )}

      {/* Notes Thread */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Remediation Notes</h4>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            className="input py-1 text-sm flex-1"
            placeholder="Add a note..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
          />
          <Button onClick={handleAddNote} disabled={!noteText.trim()}>Add</Button>
        </div>
        {(finding.remediationNotes || []).length === 0 ? (
          <p className="text-sm text-gray-400">No notes yet.</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {(finding.remediationNotes || []).map((note: RemediationNote) => (
              <div key={note.id} className="bg-gray-50 rounded p-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-gray-700">{note.author?.name || 'Unknown'}</span>
                  <span className="text-xs text-gray-400">{formatDate(note.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-800">{note.note}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
