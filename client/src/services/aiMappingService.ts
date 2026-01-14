import apiClient from './apiClient'
import { IOCType } from '../types'

export interface ColumnMapping {
  sourceColumn: string
  targetField: 'type' | 'value' | 'timestamp' | 'context' | 'source'
  confidence: number
}

export interface MappingResponse {
  mappings: ColumnMapping[]
  suggestions: Record<string, string[]>
}

export const aiMappingService = {
  /**
   * Analyzes column headers and sample data to suggest IOC field mappings
   * @param columns - Array of column headers from the uploaded file
   * @param sampleData - First few rows of data for context
   * @returns Mapping suggestions with confidence scores
   */
  async mapColumns(
    columns: string[],
    sampleData: Record<string, any>[]
  ): Promise<MappingResponse> {
    try {
      const response = await apiClient.post<MappingResponse>('/ai/map-columns', {
        columns,
        sampleData: sampleData.slice(0, 5), // Send only first 5 rows for analysis
        targetSchema: {
          required: ['type', 'value', 'timestamp'],
          optional: ['context', 'source'],
          typeOptions: [
            'IP_ADDRESS',
            'DOMAIN',
            'URL',
            'FILE_HASH_MD5',
            'FILE_HASH_SHA1',
            'FILE_HASH_SHA256',
            'EMAIL',
            'CVE',
            'REGISTRY_KEY',
            'MUTEX',
            'USER_AGENT',
            'CERTIFICATE',
            'FILE_PATH',
            'COMMAND_LINE',
          ] as IOCType[],
        },
      })
      return response.data
    } catch (error) {
      console.error('AI mapping failed:', error)
      // Fallback to basic heuristic mapping
      return this.fallbackMapping(columns)
    }
  },

  /**
   * Fallback mapping using simple heuristics when AI service is unavailable
   */
  fallbackMapping(columns: string[]): MappingResponse {
    const mappings: ColumnMapping[] = []
    const lowercaseColumns = columns.map((col) => col.toLowerCase())

    // Heuristic mapping based on common column names
    const fieldKeywords: Record<string, string[]> = {
      type: ['type', 'ioc type', 'indicator type', 'kind', 'category'],
      value: ['value', 'indicator', 'ioc', 'observable', 'data'],
      timestamp: ['timestamp', 'time', 'date', 'datetime', 'created', 'observed'],
      context: ['context', 'description', 'notes', 'details', 'comment'],
      source: ['source', 'origin', 'feed', 'provider', 'tool'],
    }

    const usedColumns = new Set<string>()

    // Try to find best matches for each field
    Object.entries(fieldKeywords).forEach(([targetField, keywords]) => {
      let bestMatch = -1
      let bestScore = 0

      lowercaseColumns.forEach((col, index) => {
        if (usedColumns.has(col)) return

        const score = keywords.reduce((acc, keyword) => {
          if (col.includes(keyword)) {
            return acc + (col === keyword ? 1.0 : 0.7)
          }
          return acc
        }, 0)

        if (score > bestScore) {
          bestScore = score
          bestMatch = index
        }
      })

      if (bestMatch !== -1 && bestScore > 0) {
        mappings.push({
          sourceColumn: columns[bestMatch],
          targetField: targetField as any,
          confidence: Math.min(bestScore, 0.9), // Cap at 0.9 for heuristic
        })
        usedColumns.add(lowercaseColumns[bestMatch])
      }
    })

    return {
      mappings,
      suggestions: {},
    }
  },
}
