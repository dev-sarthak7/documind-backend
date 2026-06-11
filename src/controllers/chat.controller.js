import Chat from '../models/Chat.model.js';
import Document from '../models/Document.model.js';
import { chatWithDocument, summarizeDocument } from '../services/chat.service.js';

export const sendMessage = async (req, res) => {
  try {
    const { documentId, question } = req.body;

    if (!documentId || !question)
      return res.status(400).json({ error: 'documentId and question are required' });

    // Check document exists and is ready
    const document = await Document.findOne({
      _id: documentId,
      userId: req.user._id,
    });

    if (!document)
      return res.status(404).json({ error: 'Document not found' });

    if (document.status !== 'ready')
      return res.status(400).json({ error: `Document is ${document.status}, not ready for chat` });

    // Get or create chat session
    let chat = await Chat.findOne({ userId: req.user._id, documentId });
    if (!chat) {
      chat = await Chat.create({ userId: req.user._id, documentId, messages: [] });
    }

    // Get chat history (last 10 messages)
    const history = chat.messages.slice(-10);

    // Get AI answer
    const { answer, sources } = await chatWithDocument(documentId, question, history);

    // Save messages to history
    chat.messages.push({ role: 'user', content: question });
    chat.messages.push({ role: 'model', content: answer });
    await chat.save();

    res.json({ answer, sources, chatId: chat._id });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Failed to process message' });
  }
};

export const getChatHistory = async (req, res) => {
  try {
    const { documentId } = req.params;

    const chat = await Chat.findOne({
      userId: req.user._id,
      documentId,
    });

    res.json({ messages: chat ? chat.messages : [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
};

export const getSummary = async (req, res) => {
  try {
    const { documentId } = req.params;

    const document = await Document.findOne({
      _id: documentId,
      userId: req.user._id,
    });

    if (!document)
      return res.status(404).json({ error: 'Document not found' });

    if (document.status !== 'ready')
      return res.status(400).json({ error: 'Document not ready yet' });

    // Cache summary in MongoDB if already generated
    if (document.summary) {
      return res.json({ summary: document.summary });
    }

    const summary = await summarizeDocument(documentId);

    // Cache it
    document.summary = summary;
    await document.save();

    res.json({ summary });
  } catch (err) {
    console.error('Summary error:', err);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
};