import express from 'express';
import { register, login, forgotPassword, logout } from '../controllers/authentication/authController.js';
const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/logout', logout);

export default router;