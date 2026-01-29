// IOC Import Configuration
export const MAX_IOC_IMPORT_SIZE = 10000 // Maximum rows per import
export const SUPPORTED_FILE_TYPES = ['.xlsx', '.csv']
export const MAX_FILE_SIZE_MB = 10 // Maximum file size in megabytes

// IOC Column Mapping
export const IOC_REQUIRED_FIELDS = ['type', 'value', 'timestamp'] as const
export const IOC_OPTIONAL_FIELDS = ['context', 'source'] as const
