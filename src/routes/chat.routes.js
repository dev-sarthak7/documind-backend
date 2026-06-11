import express from 'express';
import { sendMessage, getChatHistory, getSummary } from '../controllers/chat.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/message', protect, sendMessage);
router.get('/history/:documentId', protect, getChatHistory);
router.get('/summary/:documentId', protect, getSummary);

export default router;