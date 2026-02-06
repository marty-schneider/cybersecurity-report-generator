import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { getProjectAuditLog, getUserAuditLog } from '../controllers/auditController.js'

const router = Router()

router.use(authenticate)

router.get('/project/:projectId', getProjectAuditLog)
router.get('/user/:userId', getUserAuditLog)

export default router
