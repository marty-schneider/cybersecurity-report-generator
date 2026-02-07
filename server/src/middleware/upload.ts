import multer from 'multer'
import { join, extname } from 'path'
import { randomUUID } from 'crypto'
import { AppError } from './errorHandler.js'

const UPLOAD_DIR = join(process.cwd(), 'uploads')

const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/json',
  'application/octet-stream', // pcap, generic binary
  'application/vnd.tcpdump.pcap',
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR)
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${randomUUID()}${extname(file.originalname)}`
    cb(null, uniqueName)
  },
})

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new AppError(`File type ${file.mimetype} is not allowed`, 400))
  }
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
})

export { UPLOAD_DIR }
