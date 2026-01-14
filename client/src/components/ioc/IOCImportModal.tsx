import React, { useState } from 'react'
import * as XLSX from 'xlsx'
import Modal from '../common/Modal'
import Button from '../common/Button'
import { iocService } from '../../services/iocService'
import { aiMappingService } from '../../services/aiMappingService'
import { IOCType } from '../../types'
import { MAX_IOC_IMPORT_SIZE, SUPPORTED_FILE_TYPES } from '../../config/constants'

// Simple mapping interface for the modal state
interface SimpleColumnMapping {
  type?: string
  value?: string
  timestamp?: string
  context?: string
  source?: string
}

interface IOCImportModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  onSuccess: (count: number) => void
}

type ImportStage = 'upload' | 'mapping' | 'importing' | 'success' | 'error'

export default function IOCImportModal({ isOpen, onClose, projectId, onSuccess }: IOCImportModalProps) {
  const [stage, setStage] = useState<ImportStage>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<any[][]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [columnMapping, setColumnMapping] = useState<SimpleColumnMapping>({})
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importCount, setImportCount] = useState(0)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Validate file type
    const fileExt = selectedFile.name.toLowerCase().split('.').pop()
    if (!fileExt || !['xlsx', 'csv'].includes(fileExt)) {
      setError('Please upload a .xlsx or .csv file')
      return
    }

    setFile(selectedFile)
    setError(null)
    setStage('upload')

    try {
      // Parse the file
      const data = await parseFile(selectedFile)

      if (data.length === 0) {
        setError('The file appears to be empty')
        return
      }

      if (data.length > MAX_IOC_IMPORT_SIZE) {
        setError(`File contains ${data.length} rows. Maximum allowed is ${MAX_IOC_IMPORT_SIZE}`)
        return
      }

      const fileHeaders = data[0].map((h: any) => String(h || '').trim())
      const rows = data.slice(1)

      setHeaders(fileHeaders)
      setParsedData(rows)

      // Get AI mapping suggestions
      const sampleRows = rows.slice(0, 5).map((row: any[]) => {
        const obj: Record<string, any> = {}
        fileHeaders.forEach((header, index) => {
          obj[header] = row[index]
        })
        return obj
      })
      const mappingResult = await aiMappingService.mapColumns(fileHeaders, sampleRows)

      // Convert AI mapping results to simple format
      const simpleMapping: SimpleColumnMapping = {}
      mappingResult.mappings.forEach((mapping) => {
        simpleMapping[mapping.targetField] = mapping.sourceColumn
      })

      setColumnMapping(simpleMapping)
      setStage('mapping')
    } catch (err: any) {
      console.error('File parsing error:', err)
      setError(err.message || 'Failed to parse file')
    }
  }

  const parseFile = async (file: File): Promise<any[][]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const data = e.target?.result
          const workbook = XLSX.read(data, { type: 'binary' })
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' })
          resolve(jsonData as any[][])
        } catch (err) {
          reject(new Error('Failed to parse file'))
        }
      }

      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsBinaryString(file)
    })
  }

  const handleMappingChange = (field: keyof SimpleColumnMapping, value: string) => {
    setColumnMapping({
      ...columnMapping,
      [field]: value || undefined,
    })
  }

  const handleImport = async () => {
    if (!columnMapping.type || !columnMapping.value || !columnMapping.timestamp) {
      setError('Please map at least Type, Value, and Timestamp columns')
      return
    }

    setImporting(true)
    setError(null)

    try {
      // Transform data according to mappings
      const iocs = parsedData
        .map((row, index) => {
          try {
            const type = columnMapping.type ? String(row[headers.indexOf(columnMapping.type)] || '').trim() : ''
            const value = columnMapping.value ? String(row[headers.indexOf(columnMapping.value)] || '').trim() : ''
            const timestampRaw = columnMapping.timestamp ? row[headers.indexOf(columnMapping.timestamp)] : ''
            const context = columnMapping.context ? String(row[headers.indexOf(columnMapping.context)] || '').trim() : undefined
            const source = columnMapping.source ? String(row[headers.indexOf(columnMapping.source)] || '').trim() : undefined

            // Skip empty rows
            if (!type || !value || !timestampRaw) {
              return null
            }

            // Parse timestamp
            let timestamp: string
            if (timestampRaw instanceof Date) {
              timestamp = timestampRaw.toISOString()
            } else if (typeof timestampRaw === 'number') {
              // Excel date serial number
              const excelDate = XLSX.SSF.parse_date_code(timestampRaw)
              timestamp = new Date(excelDate.y, excelDate.m - 1, excelDate.d, excelDate.H, excelDate.M, excelDate.S).toISOString()
            } else {
              timestamp = new Date(String(timestampRaw)).toISOString()
            }

            // Normalize IOC type
            const normalizedType = normalizeIOCType(type)
            if (!normalizedType) {
              console.warn(`Row ${index + 2}: Invalid IOC type "${type}"`)
              return null
            }

            return {
              type: normalizedType,
              value,
              timestamp,
              context,
              source,
            }
          } catch (err) {
            console.warn(`Row ${index + 2}: Failed to parse`, err)
            return null
          }
        })
        .filter((ioc): ioc is NonNullable<typeof ioc> => ioc !== null)

      if (iocs.length === 0) {
        setError('No valid IOCs found in the file')
        setImporting(false)
        return
      }

      // Bulk create IOCs
      const result = await iocService.bulkCreate({ projectId, iocs })

      setImportCount(result.count)
      setStage('success')
      setImporting(false)

      // Call success callback after short delay
      setTimeout(() => {
        onSuccess(result.count)
        handleClose()
      }, 2000)
    } catch (err: any) {
      console.error('Import error:', err)
      setError(err.response?.data?.message || 'Failed to import IOCs')
      setStage('error')
      setImporting(false)
    }
  }

  const normalizeIOCType = (type: string): IOCType | null => {
    const normalized = type.toUpperCase().replace(/[^A-Z0-9]/g, '_')

    // Map common variations to standard types
    const typeMap: Record<string, IOCType> = {
      'IP': 'IP_ADDRESS',
      'IP_ADDRESS': 'IP_ADDRESS',
      'IPADDRESS': 'IP_ADDRESS',
      'DOMAIN': 'DOMAIN',
      'HOSTNAME': 'DOMAIN',
      'URL': 'URL',
      'HASH': 'FILE_HASH_SHA256',
      'MD5': 'FILE_HASH_MD5',
      'FILE_HASH_MD5': 'FILE_HASH_MD5',
      'SHA1': 'FILE_HASH_SHA1',
      'FILE_HASH_SHA1': 'FILE_HASH_SHA1',
      'SHA256': 'FILE_HASH_SHA256',
      'FILE_HASH_SHA256': 'FILE_HASH_SHA256',
      'EMAIL': 'EMAIL',
      'EMAIL_ADDRESS': 'EMAIL',
      'CVE': 'CVE',
      'REGISTRY': 'REGISTRY_KEY',
      'REGISTRY_KEY': 'REGISTRY_KEY',
      'MUTEX': 'MUTEX',
      'USER_AGENT': 'USER_AGENT',
      'USERAGENT': 'USER_AGENT',
      'CERTIFICATE': 'CERTIFICATE',
      'CERT': 'CERTIFICATE',
      'FILE_PATH': 'FILE_PATH',
      'FILEPATH': 'FILE_PATH',
      'PATH': 'FILE_PATH',
      'COMMAND': 'COMMAND_LINE',
      'COMMAND_LINE': 'COMMAND_LINE',
      'COMMANDLINE': 'COMMAND_LINE',
    }

    return typeMap[normalized] || null
  }

  const handleClose = () => {
    setStage('upload')
    setFile(null)
    setParsedData([])
    setHeaders([])
    setColumnMapping({})
    setError(null)
    setImporting(false)
    setImportCount(0)
    onClose()
  }

  const renderUploadStage = () => (
    <div>
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-4">
          Upload a CSV or Excel file containing IOCs. The AI will automatically detect which columns contain the IOC data.
        </p>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-400 transition-colors">
          <input
            type="file"
            accept=".xlsx,.csv"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <div className="text-4xl mb-2">📄</div>
            <div className="text-sm text-gray-600">
              Click to select a file or drag and drop
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Supports .xlsx and .csv (max {MAX_IOC_IMPORT_SIZE.toLocaleString()} rows)
            </div>
          </label>
        </div>
        {file && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm">
              <span className="font-medium">Selected:</span> {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </p>
          </div>
        )}
      </div>
    </div>
  )

  const renderMappingStage = () => (
    <div>
      <div className="mb-4">
        <h3 className="font-medium mb-2">Column Mapping</h3>
        <p className="text-sm text-gray-600 mb-4">
          AI has detected the following column mappings. Adjust if needed:
        </p>

        <div className="space-y-3">
          {['type', 'value', 'timestamp', 'context', 'source'].map((field) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.charAt(0).toUpperCase() + field.slice(1)}{' '}
                {['type', 'value', 'timestamp'].includes(field) && (
                  <span className="text-red-500">*</span>
                )}
              </label>
              <select
                value={columnMapping[field as keyof SimpleColumnMapping] || ''}
                onChange={(e) => handleMappingChange(field as keyof SimpleColumnMapping, e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="">-- Not mapped --</option>
                {headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded">
          <h4 className="text-sm font-medium mb-2">Preview (first 3 rows)</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr>
                  {headers.map((header) => (
                    <th key={header} className="px-2 py-1 text-left border-b">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsedData.slice(0, 3).map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j} className="px-2 py-1 border-b">
                        {String(cell || '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Total rows: {parsedData.length}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleClose} variant="secondary" disabled={importing}>
          Cancel
        </Button>
        <Button onClick={handleImport} variant="primary" disabled={importing}>
          {importing ? 'Importing...' : `Import ${parsedData.length} IOCs`}
        </Button>
      </div>
    </div>
  )

  const renderSuccessStage = () => (
    <div className="text-center py-8">
      <div className="text-6xl mb-4">✅</div>
      <h3 className="text-xl font-medium mb-2">Import Successful!</h3>
      <p className="text-gray-600">
        Successfully imported {importCount} IOCs
      </p>
    </div>
  )

  const renderErrorStage = () => (
    <div>
      <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
        <p className="text-red-800">{error}</p>
      </div>
      <Button onClick={() => setStage('mapping')} variant="primary">
        Try Again
      </Button>
    </div>
  )

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import IOCs from File">
      {error && stage !== 'error' && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {stage === 'upload' && renderUploadStage()}
      {stage === 'mapping' && renderMappingStage()}
      {stage === 'success' && renderSuccessStage()}
      {stage === 'error' && renderErrorStage()}
    </Modal>
  )
}
