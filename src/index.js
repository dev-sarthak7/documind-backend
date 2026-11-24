import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import uploadRoutes from './routes/upload.routes.js';
import authRoutes from './routes/auth.routes.js';
import documentRoutes from './routes/document.routes.js';
import chatRoutes from './routes/chat.routes.js';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';


dotenv.config();

const app = express();
// Security headers
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

// Rate limiting — 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Stricter limit for auth routes (skip GET requests such as /api/auth/me)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  skip: (req) => req.method === 'GET',
  message: { error: 'Too many login attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/', authLimiter);

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
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
  const dbState = mongoose.connection.readyState;
  const dbStatusMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  res.json({
    status: 'ok',
    message: 'DocuMind API running',
    database: dbStatusMap[dbState] || 'unknown'
  });
});

const PORT = process.env.PORT || 8000;

if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 })
    .then(() => console.log('MongoDB connected'))
    .catch(err => {
      console.error('MongoDB connection error:', err.message);
      console.log('Server is running, but database operations may fail until MongoDB is available.');
    });
} else {
  console.warn('MONGO_URI not defined in environment variables.');
}

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

export default app;