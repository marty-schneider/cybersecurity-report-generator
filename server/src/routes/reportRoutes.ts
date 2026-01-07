import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

router.post('/generate', (req, res) => {
  res.json({ message: 'Generate report - coming soon' })
})

router.get('/:id/download', (req, res) => {
  res.json({ message: 'Download report - coming soon' })
})

export default router
