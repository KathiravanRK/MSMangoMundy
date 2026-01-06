import express from 'express';
import { loginUser, getMe } from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/login', loginUser);
router.get('/me', protect, getMe);

export default router;
