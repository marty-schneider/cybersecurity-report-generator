import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import {
  getAllProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
} from '../controllers/projectController.js'

const router = Router()

// All project routes require authentication
router.use(authenticate)

router.get('/', getAllProjects)
router.post('/', createProject)
router.get('/:id', getProject)
router.put('/:id', updateProject)
router.delete('/:id', deleteProject)

export default router
