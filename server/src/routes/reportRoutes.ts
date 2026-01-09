import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { reportController } from '../controllers/reportController.js'

const router = Router()

router.use(authenticate)

// Generate new report
router.post('/generate', (req, res) => reportController.generateReport(req, res))

// Get existing report
router.get('/:id', (req, res) => reportController.getReport(req, res))

// List reports for a project
router.get('/', (req, res) => reportController.listReports(req, res))

export default router
