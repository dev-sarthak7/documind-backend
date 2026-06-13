import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import uploadRoutes from './routes/upload.routes.js';
import authRoutes from './routes/auth.routes.js';
import documentRoutes from './routes/document.routes.js';
import chatRoutes from './routes/chat.routes.js';


dotenv.config();

const app = express();
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://documind-frontend-black.vercel.app',
    'https://documind.sarthaksb.me',
    'https://www.documind.sarthaksb.me',
  ],
  credentials: true,
}));
app.use(express.json());
app.use('/api/upload', uploadRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/chat', chatRoutes);




// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'DocuMind API running' });
});

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.error('MongoDB connection error:', err));

export default app;