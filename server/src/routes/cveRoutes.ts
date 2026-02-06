import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { lookupCVE, enrichFinding, enrichProject } from '../controllers/cveController.js'

const router = Router()

router.use(authenticate)

router.get('/lookup', lookupCVE)
router.post('/enrich/finding/:id', enrichFinding)
router.post('/enrich/project/:projectId', enrichProject)

export default router
