import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import {
  listFrameworks,
  getControls,
  mapFinding,
  unmapFinding,
  getFindingMappings,
  getProjectComplianceSummary,
} from '../controllers/complianceController.js'

const router = Router()

router.use(authenticate)

router.get('/frameworks', listFrameworks)
router.get('/frameworks/:frameworkId/controls', getControls)
router.post('/map', mapFinding)
router.delete('/map/:id', unmapFinding)
router.get('/finding/:findingId', getFindingMappings)
router.get('/project/:projectId/summary', getProjectComplianceSummary)

export default router
