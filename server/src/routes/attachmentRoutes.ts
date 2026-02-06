import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { upload } from '../middleware/upload.js'
import {
  uploadAttachment,
  getAttachment,
  listAttachments,
  deleteAttachment,
} from '../controllers/attachmentController.js'

const router = Router()

router.use(authenticate)

// Upload a file to a finding
router.post('/:findingId/upload', upload.single('file'), uploadAttachment)

// List attachments for a finding
router.get('/finding/:findingId', listAttachments)

// Get/download a specific attachment
router.get('/:id', getAttachment)

// Delete an attachment
router.delete('/:id', deleteAttachment)

export default router
