import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import {
  getIOCs,
  getIOC,
  createIOC,
  bulkCreateIOCs,
  updateIOC,
  deleteIOC,
} from '../controllers/iocController.js'

const router = Router()

router.use(authenticate)

router.get('/', getIOCs)
router.post('/', createIOC)
router.post('/bulk', bulkCreateIOCs)
router.get('/:id', getIOC)
router.put('/:id', updateIOC)
router.delete('/:id', deleteIOC)

export default router
