import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import {
  getFindings,
  getFinding,
  createFinding,
  updateFinding,
  deleteFinding,
} from '../controllers/findingController.js'

const router = Router()

router.use(authenticate)

router.get('/', getFindings)
router.post('/', createFinding)
router.get('/:id', getFinding)
router.put('/:id', updateFinding)
router.delete('/:id', deleteFinding)

export default router
