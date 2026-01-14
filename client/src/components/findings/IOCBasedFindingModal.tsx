import { useState, useEffect } from 'react'
import { Finding, IOCType, Severity } from '../../types'
import Modal from '../common/Modal'
import Button from '../common/Button'
import apiClient from '../../services/apiClient'

interface IOCBasedFindingModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  onFindingCreated: (finding: Finding) => void
}

interface IOCFormData {
  type: IOCType
  value: string
  timestamp: string
  context: string
  affectedSystems: string
}

interface AIGeneratedContent {
  title: string
  description: string
  severity: Severity
  cvssScore?: number
  remediation: string
  technicalRemediation?: string
  executiveSummary?: string
  affectedSystems: string[]
  evidence: string
}

type ProcessingStep = 'validating' | 'fetching-cve' | 'generating' | 'finishing'

const IOC_TYPES: { value: IOCType; label: string }[] = [
  { value: 'CVE', label: 'CVE (Common Vulnerabilities and Exposures)' },
  { value: 'IP_ADDRESS', label: 'IP Address' },
  { value: 'DOMAIN', label: 'Domain' },
  { value: 'URL', label: 'URL' },
  { value: 'FILE_HASH_MD5', label: 'File Hash (MD5)' },
  { value: 'FILE_HASH_SHA1', label: 'File Hash (SHA1)' },
  { value: 'FILE_HASH_SHA256', label: 'File Hash (SHA256)' },
  { value: 'EMAIL', label: 'Email Address' },
  { value: 'REGISTRY_KEY', label: 'Registry Key' },
  { value: 'MUTEX', label: 'Mutex' },
  { value: 'USER_AGENT', label: 'User Agent' },
  { value: 'CERTIFICATE', label: 'Certificate' },
  { value: 'FILE_PATH', label: 'File Path' },
  { value: 'COMMAND_LINE', label: 'Command Line' },
]

const SEVERITY_OPTIONS: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']

export default function IOCBasedFindingModal({
  isOpen,
  onClose,
  projectId,
  onFindingCreated,
}: IOCBasedFindingModalProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)
  const [iocFormData, setIOCFormData] = useState<IOCFormData>({
    type: 'CVE',
    value: '',
    timestamp: new Date().toISOString().slice(0, 16),
    context: '',
    affectedSystems: '',
  })
  const [aiContent, setAIContent] = useState<AIGeneratedContent | null>(null)
  const [editableContent, setEditableContent] = useState<AIGeneratedContent | null>(null)
  const [processingStep, setProcessingStep] = useState<ProcessingStep>('validating')
  const [error, setError] = useState<string>('')
  const [validationError, setValidationError] = useState<string>('')
  const [isRegenerating, setIsRegenerating] = useState(false)

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(1)
      setIOCFormData({
        type: 'CVE',
        value: '',
        timestamp: new Date().toISOString().slice(0, 16),
        context: '',
        affectedSystems: '',
      })
      setAIContent(null)
      setEditableContent(null)
      setError('')
      setValidationError('')
      setIsRegenerating(false)
    }
  }, [isOpen])

  // Validate IOC value based on type
  const validateIOCValue = (type: IOCType, value: string): string => {
    if (!value.trim()) {
      return 'IOC value is required'
    }

    switch (type) {
      case 'CVE':
        if (!/^CVE-\d{4}-\d{4,}$/i.test(value)) {
          return 'CVE format must be CVE-YYYY-NNNNN+ (e.g., CVE-2021-44228)'
        }
        break
      case 'IP_ADDRESS':
        if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) {
          return 'Invalid IP address format (e.g., 192.168.1.1)'
        }
        // Validate each octet
        const octets = value.split('.')
        if (octets.some(octet => parseInt(octet) > 255)) {
          return 'Invalid IP address - octets must be 0-255'
        }
        break
      case 'DOMAIN':
        if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(value)) {
          return 'Invalid domain format (e.g., example.com)'
        }
        break
      case 'FILE_HASH_MD5':
        if (!/^[a-fA-F0-9]{32}$/.test(value)) {
          return 'Invalid MD5 hash - must be 32 hexadecimal characters'
        }
        break
      case 'FILE_HASH_SHA1':
        if (!/^[a-fA-F0-9]{40}$/.test(value)) {
          return 'Invalid SHA1 hash - must be 40 hexadecimal characters'
        }
        break
      case 'FILE_HASH_SHA256':
        if (!/^[a-fA-F0-9]{64}$/.test(value)) {
          return 'Invalid SHA256 hash - must be 64 hexadecimal characters'
        }
        break
      case 'EMAIL':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return 'Invalid email address format'
        }
        break
    }

    return ''
  }

  // Handle IOC form input changes
  const handleIOCInputChange = (field: keyof IOCFormData, value: string) => {
    setIOCFormData(prev => ({ ...prev, [field]: value }))
    if (field === 'value' || field === 'type') {
      setValidationError('')
    }
  }

  // Proceed to AI processing
  const handleProceedToProcessing = async () => {
    const error = validateIOCValue(iocFormData.type, iocFormData.value)
    if (error) {
      setValidationError(error)
      return
    }

    setCurrentStep(2)
    setError('')
    await processIOCWithAI()
  }

  // Process IOC with AI
  const processIOCWithAI = async () => {
    try {
      setProcessingStep('validating')
      await new Promise(resolve => setTimeout(resolve, 800))

      if (iocFormData.type === 'CVE') {
        setProcessingStep('fetching-cve')
        await new Promise(resolve => setTimeout(resolve, 1200))
      }

      setProcessingStep('generating')

      const affectedSystemsArray = iocFormData.affectedSystems
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)

      const response = await apiClient.post('/findings/from-ioc', {
        projectId,
        iocData: {
          type: iocFormData.type,
          value: iocFormData.value,
          timestamp: new Date(iocFormData.timestamp).toISOString(),
          context: iocFormData.context || undefined,
        },
        affectedSystems: affectedSystemsArray.length > 0 ? affectedSystemsArray : undefined,
      })

      setProcessingStep('finishing')
      await new Promise(resolve => setTimeout(resolve, 600))

      const finding = response.data.finding
      const content: AIGeneratedContent = {
        title: finding.title,
        description: finding.description,
        severity: finding.severity,
        cvssScore: finding.cvssScore || undefined,
        remediation: finding.remediation,
        affectedSystems: finding.affectedSystems || [],
        evidence: finding.evidence || '',
      }

      setAIContent(content)
      setEditableContent(content)
      setCurrentStep(3)
    } catch (err: any) {
      console.error('Failed to process IOC:', err)
      const errorMessage = err.response?.data?.message || err.message || 'Failed to generate AI content'
      setError(errorMessage)
      setCurrentStep(1)
    }
  }

  // Handle regenerate with AI
  const handleRegenerate = async () => {
    setIsRegenerating(true)
    setCurrentStep(2)
    await processIOCWithAI()
    setIsRegenerating(false)
  }

  // Save finding
  const handleSaveFinding = async () => {
    if (!editableContent) return

    try {
      const response = await apiClient.post('/findings', {
        projectId,
        title: editableContent.title,
        description: editableContent.description,
        severity: editableContent.severity,
        cvssScore: editableContent.cvssScore || undefined,
        affectedSystems: editableContent.affectedSystems,
        evidence: editableContent.evidence || undefined,
        remediation: editableContent.remediation,
      })

      onFindingCreated(response.data)
      onClose()
    } catch (err: any) {
      console.error('Failed to save finding:', err)
      setError(err.response?.data?.message || 'Failed to save finding')
    }
  }

  // Handle editable content changes
  const handleEditableChange = (field: keyof AIGeneratedContent, value: string | number | string[]) => {
    if (!editableContent) return
    setEditableContent(prev => prev ? { ...prev, [field]: value } : null)
  }

  // Get processing message
  const getProcessingMessage = () => {
    switch (processingStep) {
      case 'validating':
        return 'Validating IOC...'
      case 'fetching-cve':
        return 'Fetching CVE data...'
      case 'generating':
        return 'Generating finding details with AI...'
      case 'finishing':
        return 'Almost done...'
    }
  }

  // Render step indicator
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-6">
      {[1, 2, 3].map(step => (
        <div key={step} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${
              step === currentStep
                ? 'bg-blue-600 text-white'
                : step < currentStep
                ? 'bg-green-600 text-white'
                : 'bg-gray-300 text-gray-600'
            }`}
          >
            {step < currentStep ? '✓' : step}
          </div>
          {step < 3 && (
            <div
              className={`w-16 h-1 ${
                step < currentStep ? 'bg-green-600' : 'bg-gray-300'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )

  // Render Step 1: IOC Input
  const renderStep1 = () => (
    <div className="space-y-4">
      {renderStepIndicator()}
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Step 1: Enter IOC Details</h3>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label className="label">IOC Type</label>
        <select
          value={iocFormData.type}
          onChange={e => handleIOCInputChange('type', e.target.value)}
          className="input"
        >
          {IOC_TYPES.map(type => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">IOC Value</label>
        <input
          type="text"
          value={iocFormData.value}
          onChange={e => handleIOCInputChange('value', e.target.value)}
          className={`input ${validationError ? 'border-red-500' : ''}`}
          placeholder={
            iocFormData.type === 'CVE'
              ? 'CVE-2021-44228'
              : iocFormData.type === 'IP_ADDRESS'
              ? '192.168.1.100'
              : iocFormData.type === 'DOMAIN'
              ? 'malicious-domain.com'
              : iocFormData.type === 'FILE_HASH_MD5'
              ? 'a1b2c3d4e5f6...'
              : 'Enter IOC value'
          }
        />
        {validationError && (
          <p className="text-red-600 text-sm mt-1">{validationError}</p>
        )}
      </div>

      <div>
        <label className="label">Timestamp</label>
        <input
          type="datetime-local"
          value={iocFormData.timestamp}
          onChange={e => handleIOCInputChange('timestamp', e.target.value)}
          className="input"
        />
      </div>

      <div>
        <label className="label">Context (Optional)</label>
        <textarea
          value={iocFormData.context}
          onChange={e => handleIOCInputChange('context', e.target.value)}
          className="input"
          rows={3}
          placeholder="Found in web server logs during quarterly scan"
        />
      </div>

      <div>
        <label className="label">Affected Systems (Optional)</label>
        <input
          type="text"
          value={iocFormData.affectedSystems}
          onChange={e => handleIOCInputChange('affectedSystems', e.target.value)}
          className="input"
          placeholder="web-server-01, db-server-02"
        />
        <p className="text-sm text-gray-500 mt-1">Comma-separated list of system names</p>
      </div>

      <div className="flex gap-3 pt-4">
        <Button onClick={onClose} variant="secondary" className="flex-1">
          Cancel
        </Button>
        <Button onClick={handleProceedToProcessing} className="flex-1">
          Generate with AI
        </Button>
      </div>
    </div>
  )

  // Render Step 2: AI Processing
  const renderStep2 = () => (
    <div className="space-y-6">
      {renderStepIndicator()}
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Step 2: AI Processing</h3>

      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-6"></div>
        <p className="text-lg text-gray-700 font-medium">{getProcessingMessage()}</p>
        <p className="text-sm text-gray-500 mt-2">This may take 5-15 seconds...</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
        <p className="text-sm">
          Our AI is analyzing the IOC and generating comprehensive finding details including
          description, remediation steps, and risk assessment.
        </p>
      </div>
    </div>
  )

  // Render Step 3: Review & Edit
  const renderStep3 = () => {
    if (!editableContent) return null

    return (
      <div className="space-y-4">
        {renderStepIndicator()}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Step 3: Review & Edit</h3>
          <span className="px-3 py-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-medium rounded-full shadow-sm">
            ✨ AI-Generated
          </span>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-2">
          <div>
            <label className="label">Title</label>
            <input
              type="text"
              value={editableContent.title}
              onChange={e => handleEditableChange('title', e.target.value)}
              className="input"
            />
          </div>

          <div>
            <label className="label">Severity</label>
            <select
              value={editableContent.severity}
              onChange={e => handleEditableChange('severity', e.target.value as Severity)}
              className="input"
            >
              {SEVERITY_OPTIONS.map(severity => (
                <option key={severity} value={severity}>
                  {severity}
                </option>
              ))}
            </select>
          </div>

          {editableContent.cvssScore !== undefined && (
            <div>
              <label className="label">CVSS Score</label>
              <input
                type="number"
                value={editableContent.cvssScore}
                readOnly
                className="input bg-gray-50"
                step="0.1"
                min="0"
                max="10"
              />
              <p className="text-sm text-gray-500 mt-1">Read-only (from CVE data)</p>
            </div>
          )}

          <div>
            <label className="label">Description</label>
            <textarea
              value={editableContent.description}
              onChange={e => handleEditableChange('description', e.target.value)}
              className="input"
              rows={6}
            />
          </div>

          <div>
            <label className="label">Technical Remediation</label>
            <textarea
              value={editableContent.remediation}
              onChange={e => handleEditableChange('remediation', e.target.value)}
              className="input"
              rows={8}
            />
          </div>

          <div>
            <label className="label">Affected Systems</label>
            <input
              type="text"
              value={editableContent.affectedSystems.join(', ')}
              onChange={e =>
                handleEditableChange(
                  'affectedSystems',
                  e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                )
              }
              className="input"
              placeholder="web-server-01, db-server-02"
            />
            <p className="text-sm text-gray-500 mt-1">Comma-separated list</p>
          </div>

          <div>
            <label className="label">Evidence</label>
            <textarea
              value={editableContent.evidence}
              onChange={e => handleEditableChange('evidence', e.target.value)}
              className="input"
              rows={4}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button onClick={handleRegenerate} variant="secondary" disabled={isRegenerating}>
            {isRegenerating ? 'Regenerating...' : 'Regenerate with AI'}
          </Button>
          <Button onClick={handleSaveFinding} className="flex-1">
            Save Finding
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Finding from IOC"
    >
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}
    </Modal>
  )
}
