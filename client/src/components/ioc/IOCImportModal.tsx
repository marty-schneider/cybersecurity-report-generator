import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { IOCType } from '../../types'
import { iocService } from '../../services/iocService'
import { aiMappingService } from '../../services/aiMappingService'
import Modal from '../common/Modal'
import Button from '../common/Button'

interface IOCImportModalProps {
    isOpen: boolean
    onClose: () => void
    projectId: string
    onImportComplete: () => void
}

interface ColumnMapping {
    type: string | null
    value: string | null
    timestamp: string | null
    context: string | null
    source: string | null
}

const REQUIRED_FIELDS = ['type', 'value', 'timestamp']

export default function IOCImportModal({ isOpen, onClose, projectId, onImportComplete }: IOCImportModalProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [step, setStep] = useState<'UPLOAD' | 'MAPPING' | 'REVIEW' | 'IMPORTING'>('UPLOAD')
    const [fileData, setFileData] = useState<any[]>([])
    const [headers, setHeaders] = useState<string[]>([])
    const [mapping, setMapping] = useState<ColumnMapping>({
        type: null,
        value: null,
        timestamp: null,
        context: null,
        source: null,
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [importStats, setImportStats] = useState({ total: 0, distinct: 0 })

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setLoading(true)
        setError('')

        try {
            const data = await parseFile(file)
            if (data.length === 0) throw new Error('File appears to be empty')

            const fileHeaders = Object.keys(data[0])
            setHeaders(fileHeaders)
            setFileData(data)

            // Get AI mapping suggestion
            const sampleData = data.slice(0, 5).map(row => Object.values(row))

            try {
                const suggestion = await aiMappingService.mapColumns(fileHeaders, sampleData)
                setMapping({
                    type: suggestion.type || null,
                    value: suggestion.value || null,
                    timestamp: suggestion.timestamp || null,
                    context: suggestion.context || null,
                    source: suggestion.source || null,
                })
            } catch (err) {
                console.warn('AI mapping failed, falling back to manual mapping', err)
                // Fallback: try to match headers case-insensitively
                const newMapping: any = { ...mapping }
                fileHeaders.forEach(h => {
                    const lower = h.toLowerCase()
                    if (lower.includes('type')) newMapping.type = h
                    else if (lower.includes('ip') || lower.includes('domain') || lower.includes('hash') || lower.includes('value') || lower.includes('ioc')) newMapping.value = h
                    else if (lower.includes('time') || lower.includes('date')) newMapping.timestamp = h
                    else if (lower.includes('context') || lower.includes('desc') || lower.includes('note')) newMapping.context = h
                    else if (lower.includes('source')) newMapping.source = h
                })
                setMapping(newMapping)
            }

            setStep('MAPPING')
        } catch (err: any) {
            setError(err.message || 'Failed to parse file')
        } finally {
            setLoading(false)
        }
    }

    const parseFile = (file: File): Promise<any[]> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (e) => {
                try {
                    const data = e.target?.result
                    const workbook = XLSX.read(data, { type: 'binary' })
                    const sheetName = workbook.SheetNames[0]
                    const sheet = workbook.Sheets[sheetName]
                    const json = XLSX.utils.sheet_to_json(sheet)
                    resolve(json)
                } catch (err) {
                    reject(err)
                }
            }
            reader.onerror = (err) => reject(err)
            reader.readAsBinaryString(file)
        })
    }

    const handleMappingChange = (field: keyof ColumnMapping, header: string) => {
        setMapping(prev => ({ ...prev, [field]: header }))
    }

    const validateMapping = () => {
        const missing = REQUIRED_FIELDS.filter(field => !mapping[field as keyof ColumnMapping])
        if (missing.length > 0) {
            setError(`Please map the following required fields: ${missing.join(', ')}`)
            return false
        }
        return true
    }

    const handleImport = async () => {
        if (!validateMapping()) return

        setLoading(true)
        setStep('IMPORTING')
        setError('')

        try {
            // Transform data
            const iocs = fileData.map(row => {
                // Attempt to normalize type
                let typeStr = String(row[mapping.type!]).toUpperCase().replace(/ /g, '_')
                // Basic normalization or fallback
                // In a real app, might need more robust type detection/validation
                if (!isValidIOCType(typeStr)) {
                    // Try to infer from value if type is invalid/missing
                    // For now, default to 'IP_ADDRESS' or skip?
                    // Let's default to UNKNOWN or handle error. 
                    // Since strict typing, let's try to map common names
                    if (typeStr.includes('IP')) typeStr = 'IP_ADDRESS'
                    else if (typeStr.includes('URL')) typeStr = 'URL'
                    else if (typeStr.includes('DOMAIN')) typeStr = 'DOMAIN'
                    else if (typeStr.includes('MD5')) typeStr = 'FILE_HASH_MD5'
                    else if (typeStr.includes('SHA256')) typeStr = 'FILE_HASH_SHA256'
                    else if (typeStr.includes('EMAIL')) typeStr = 'EMAIL'
                    else typeStr = 'IP_ADDRESS' // Fallback for MVP
                }

                return {
                    type: typeStr as IOCType,
                    value: String(row[mapping.value!]),
                    timestamp: new Date(row[mapping.timestamp!]).toISOString(),
                    context: mapping.context ? String(row[mapping.context]) : undefined,
                    source: mapping.source ? String(row[mapping.source]) : undefined,
                }
            }).filter(ioc => ioc.value && ioc.type) // Basic filter

            await iocService.bulkCreate({ projectId, iocs })

            setImportStats({ total: iocs.length, distinct: iocs.length }) // Server should return this ideally
            onImportComplete()
            onClose()

            // Reset state
            setStep('UPLOAD')
            setFileData([])
            setHeaders([])
            setMapping({ type: null, value: null, timestamp: null, context: null, source: null })

        } catch (err: any) {
            console.error('Import failed', err)
            setError(err.response?.data?.message || 'Failed to import IOCs')
            setStep('MAPPING')
        } finally {
            setLoading(false)
        }
    }

    const isValidIOCType = (type: string): boolean => {
        const validTypes = [
            'IP_ADDRESS', 'DOMAIN', 'URL', 'FILE_HASH_MD5', 'FILE_HASH_SHA1',
            'FILE_HASH_SHA256', 'EMAIL', 'CVE', 'REGISTRY_KEY', 'MUTEX',
            'USER_AGENT', 'CERTIFICATE', 'FILE_PATH', 'COMMAND_LINE'
        ]
        return validTypes.includes(type)
    }

    const reset = () => {
        setStep('UPLOAD')
        setFileData([])
        setHeaders([])
        setError('')
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    if (!isOpen) return null

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Import IOCs from File">
            <div className="space-y-6">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                        {error}
                    </div>
                )}

                {step === 'UPLOAD' && (
                    <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                        <div className="mb-4 text-gray-500">
                            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <p className="mt-2 text-sm font-medium">Upload Excel (.xlsx) or CSV file</p>
                        </div>

                        <input
                            type="file"
                            ref={fileInputRef}
                            accept=".csv, .xlsx, .xls"
                            onChange={handleFileChange}
                            className="hidden"
                            id="file-upload"
                        />
                        <label htmlFor="file-upload">
                            <Button onClick={() => fileInputRef.current?.click()} disabled={loading}>
                                {loading ? 'Analyzing...' : 'Select File'}
                            </Button>
                        </label>
                    </div>
                )}

                {step === 'MAPPING' && (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600 mb-4">
                            We've analyzed your file. Please verify the column mapping below.
                        </p>

                        <div className="grid grid-cols-2 gap-4">
                            {['type', 'value', 'timestamp', 'context', 'source'].map((field) => (
                                <div key={field}>
                                    <label className="label capitalize">
                                        {field} {REQUIRED_FIELDS.includes(field) && <span className="text-red-500">*</span>}
                                    </label>
                                    <select
                                        className="input"
                                        value={mapping[field as keyof ColumnMapping] || ''}
                                        onChange={(e) => handleMappingChange(field as keyof ColumnMapping, e.target.value)}
                                    >
                                        <option value="">-- Select Column --</option>
                                        {headers.map(h => (
                                            <option key={h} value={h}>{h}</option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <Button variant="secondary" onClick={reset}>Back</Button>
                            <Button onClick={handleImport} disabled={loading}>
                                {loading ? 'Importing...' : 'Import IOCs'}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    )
}
