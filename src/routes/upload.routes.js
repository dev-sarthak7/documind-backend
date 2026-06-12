import express from 'express';
import { generateUploadUrl } from '../services/s3.service.js';
import { protect } from '../middleware/auth.middleware.js';
import Document from '../models/Document.model.js';
import { processDocument } from '../services/processor.service.js';

const router = express.Router();

// Step 1 — Get presigned URL for upload
router.post('/presigned-url', protect, async (req, res) => {
  try {
    const { fileName, fileType, fileSize } = req.body;

    if (!fileName || !fileType)
      return res.status(400).json({ error: 'fileName and fileType are required' });

    const allowedTypes = ['application/pdf', 'text/plain'];
    if (!allowedTypes.includes(fileType))
      return res.status(400).json({ error: 'Only PDF and TXT files are allowed' });

    const { uploadUrl, fileKey } = await generateUploadUrl(fileName, fileType);

    const document = await Document.create({
      userId: req.user._id,
      fileName,
      fileKey,
      fileType,
      fileSize,
      status: 'uploaded',
    });

    res.json({ uploadUrl, fileKey, documentId: document._id });
  } catch (err) {
    console.error('Presigned URL error:', err);
    res.status(500).json({ error: 'Failed to generate upload URL' });
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

    document.status = 'processing';
    await document.save();

    res.json({ message: 'Document queued for processing', documentId });

    // Process asynchronously
    processDocument(document._id.toString(), document.fileKey, document.fileType);

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
