import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import {
  updateRemediationStatus,
  addRemediationNote,
  getTimeline,
  getProjectRemediationDashboard,
} from '../controllers/remediationController.js'

const router = Router()

router.use(authenticate)

// Remediation status & dates
router.patch('/findings/:findingId/remediation', updateRemediationStatus)

// Remediation notes
router.post('/findings/:findingId/notes', addRemediationNote)

// Timeline for a finding
router.get('/findings/:findingId/timeline', getTimeline)

// Project-level remediation dashboard
router.get('/projects/:projectId/dashboard', getProjectRemediationDashboard)

export default router
