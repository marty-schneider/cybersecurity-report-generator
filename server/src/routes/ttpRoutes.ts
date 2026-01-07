import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import {
  getTTPs,
  analyzeTTPs,
  getTTPDetails,
  getTTPMatrix,
  deleteTTPMapping,
} from '../controllers/ttpController.js'

const router = Router()

router.use(authenticate)

router.get('/', getTTPs)
router.post('/analyze', analyzeTTPs)
router.get('/matrix', getTTPMatrix)
router.get('/technique/:techniqueId', getTTPDetails)
router.delete('/:id', deleteTTPMapping)

export default router
