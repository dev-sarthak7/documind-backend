import express from 'express';
import {
  processComplete,
  processFailed,
  getDocument,
  deleteDocument,
} from '../controllers/document.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// Internal routes (called by Lambda)
router.post('/process-complete', processComplete);
router.post('/process-failed', processFailed);

// Protected routes (called by frontend)
router.get('/:id', protect, getDocument);
router.delete('/:id', protect, deleteDocument);

export default router;