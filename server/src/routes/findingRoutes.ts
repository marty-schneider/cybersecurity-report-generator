import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import {
  getFindings,
  getFinding,
  createFinding,
  updateFinding,
  deleteFinding,
  createFindingFromIOC,
} from '../controllers/findingController.js'

const router = Router()

router.use(authenticate)

router.get('/', getFindings)
router.post('/', createFinding)
router.post('/from-ioc', createFindingFromIOC)
router.get('/:id', getFinding)
router.put('/:id', updateFinding)
router.delete('/:id', deleteFinding)

export default router
