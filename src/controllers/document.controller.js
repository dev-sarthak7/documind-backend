import Document from '../models/Document.model.js';
import Chat from '../models/Chat.model.js';
import { storeChunks, deleteChunks } from '../services/rag.service.js';
import { deleteFile } from '../services/s3.service.js';

// Called by Lambda after processing is complete
export const processComplete = async (req, res) => {
  try {
    const { documentId, chunks, pageCount, secret } = req.body;

    if (secret !== process.env.INTERNAL_SECRET)
      return res.status(401).json({ error: 'Unauthorized' });

    // Store chunks in ChromaDB with embeddings
    await storeChunks(documentId, chunks);

    // Update document status in MongoDB
    await Document.findByIdAndUpdate(documentId, {
      status: 'ready',
      pageCount,
    });

    res.json({ message: 'Document processed successfully' });
  } catch (err) {
    console.error('Process complete error:', err);
    res.status(500).json({ error: 'Failed to store document chunks' });
  }
};

// Called by Lambda on failure
export const processFailed = async (req, res) => {
  try {
    const { documentId, error, secret } = req.body;

    if (secret !== process.env.INTERNAL_SECRET)
      return res.status(401).json({ error: 'Unauthorized' });

    await Document.findByIdAndUpdate(documentId, { status: 'failed' });
    console.error(`Document ${documentId} processing failed:`, error);

    res.json({ message: 'Failure recorded' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update document status' });
  }
};

// Get single document status
export const getDocument = async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!document)
      return res.status(404).json({ error: 'Document not found' });

    res.json({ document });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch document' });
  }
};

// Delete a document
export const deleteDocument = async (req, res) => {
  try {
    const document = await Document.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!document)
      return res.status(404).json({ error: 'Document not found' });

    // 1. Delete vectors from ChromaDB
    try {
      await deleteChunks(document._id.toString());
    } catch (chromaErr) {
      console.warn('Chroma chunk deletion warning:', chromaErr.message);
    }

    // 2. Delete file from S3
    if (document.fileKey) {
      try {
        await deleteFile(document.fileKey);
      } catch (s3Err) {
        console.warn('S3 file deletion warning:', s3Err.message);
      }
    }

    // 3. Delete associated chat history
    try {
      await Chat.deleteMany({ documentId: document._id });
    } catch (chatErr) {
      console.warn('Chat deletion warning:', chatErr.message);
    }

    // 4. Delete document record from MongoDB
    await document.deleteOne();

    res.json({ message: 'Document deleted successfully', documentId: req.params.id });
  } catch (err) {
    console.error('Delete document error:', err);
    res.status(500).json({ error: 'Failed to delete document' });
  }
};