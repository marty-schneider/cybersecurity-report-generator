import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { exportCSV, exportJSON, exportHTML, exportDOCX } from '../controllers/exportController.js'

const router = Router()

router.use(authenticate)

router.get('/csv/:projectId', exportCSV)
router.get('/json/:projectId', exportJSON)
router.get('/html/:projectId', exportHTML)
router.get('/docx/:projectId', exportDOCX)

export default router
