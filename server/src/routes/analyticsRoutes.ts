import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import {
  getOverviewStats,
  getSeverityDistribution,
  getFindingsOverTime,
  getIOCTypeBreakdown,
  getMitreHeatmap,
  getStatusDistribution,
  getRiskPosture,
} from '../controllers/analyticsController.js'

const router = Router()

router.use(authenticate)

router.get('/overview', getOverviewStats)
router.get('/severity-distribution', getSeverityDistribution)
router.get('/status-distribution', getStatusDistribution)
router.get('/findings-over-time', getFindingsOverTime)
router.get('/ioc-type-breakdown', getIOCTypeBreakdown)
router.get('/mitre-heatmap', getMitreHeatmap)
router.get('/risk-posture', getRiskPosture)

export default router
