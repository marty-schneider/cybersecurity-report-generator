import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '../controllers/notificationController.js'

const router = Router()

router.use(authenticate)

router.get('/', getNotifications)
router.get('/unread-count', getUnreadCount)
router.patch('/:id/read', markAsRead)
router.patch('/read-all', markAllAsRead)

export default router
