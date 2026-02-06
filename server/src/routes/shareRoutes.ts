import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import {
  createShareLink,
  revokeShareLink,
  listShareLinks,
  viewSharedReport,
  verifyAndViewSharedReport,
} from '../controllers/shareController.js'

const router = Router()

// Public routes (no auth)
router.get('/view/:token', viewSharedReport)
router.post('/view/:token/verify', verifyAndViewSharedReport)

// Authenticated routes
router.post('/', authenticate, createShareLink)
router.delete('/:id', authenticate, revokeShareLink)
router.get('/report/:reportId/links', authenticate, listShareLinks)

export default router
