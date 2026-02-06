import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getCategories,
} from '../controllers/findingTemplateController.js'

const router = Router()

router.use(authenticate)

router.get('/', listTemplates)
router.get('/categories', getCategories)
router.get('/:id', getTemplate)
router.post('/', createTemplate)
router.put('/:id', updateTemplate)
router.delete('/:id', deleteTemplate)

export default router
