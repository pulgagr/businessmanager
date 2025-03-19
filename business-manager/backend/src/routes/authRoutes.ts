import express from 'express';
import {
  register,
  login,
  refreshToken,
  logout,
  getCurrentUser,
  changePassword,
  requestPasswordReset,
  resetPassword
} from '../controllers/authController';
import { protect, userExists } from '../middleware/authMiddleware';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.post('/request-password-reset', requestPasswordReset);
router.post('/reset-password', resetPassword);

// Protected routes
router.post('/logout', protect, logout);
router.get('/me', protect, userExists, getCurrentUser);
router.post('/change-password', protect, userExists, changePassword);

export default router;
