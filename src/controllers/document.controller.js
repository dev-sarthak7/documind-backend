import Document from '../models/Document.model.js';
import { storeChunks, deleteChunks } from '../services/rag.service.js';

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

    await deleteChunks(document._id.toString());
    await document.deleteOne();

    res.json({ message: 'Document deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete document' });
  }
};