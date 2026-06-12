import express from 'express';
import { generateUploadUrl } from '../services/s3.service.js';
import { sendProcessingMessage } from '../services/sqs.service.js';
import { protect } from '../middleware/auth.middleware.js';
import Document from '../models/Document.model.js';
import { processDocument } from '../services/processor.service.js';

const router = express.Router();

// Step 1 — Get presigned URL for upload
// Step 2 — Confirm upload complete, trigger processing
router.post('/confirm', protect, async (req, res) => {
  try {
    const { documentId } = req.body;

    const document = await Document.findOne({
      _id: documentId,
      userId: req.user._id,
    });

    if (!document)
      return res.status(404).json({ error: 'Document not found' });

    document.status = 'processing';
    await document.save();

    // Respond immediately, process in background
    res.json({ message: 'Document queued for processing', documentId });

    // Process asynchronously (don't await)
    processDocument(document._id.toString(), document.fileKey, document.fileType);

  } catch (err) {
    console.error('Confirm upload error:', err);
    res.status(500).json({ error: 'Failed to confirm upload' });
  }
});
// Step 2 — Confirm upload complete, trigger processing
router.post('/confirm', protect, async (req, res) => {
  try {
    const { documentId } = req.body;

    const document = await Document.findOne({
      _id: documentId,
      userId: req.user._id,
    });

    if (!document)
      return res.status(404).json({ error: 'Document not found' });

    // Update status to processing
    document.status = 'processing';
    await document.save();

    // Send to SQS for async processing
    await sendProcessingMessage(document._id.toString(), document.fileKey, document.fileType);

    res.json({ message: 'Document queued for processing', documentId });
  } catch (err) {
    console.error('Confirm upload error:', err);
    res.status(500).json({ error: 'Failed to confirm upload' });
  }
});

// Get all documents for logged in user
router.get('/documents', protect, async (req, res) => {
  try {
    const documents = await Document.find({ userId: req.user._id })
      .sort({ createdAt: -1 });
    res.json({ documents });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

export default router;