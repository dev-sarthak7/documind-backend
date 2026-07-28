# DocuMind — Backend API

> RAG-powered document intelligence platform. Upload PDFs, ask questions, get AI answers grounded in your documents.

🌐 **Live:** [documind.sarthaksb.me](https://documind.sarthaksb.me) · **Frontend Repo:** [documind-frontend](https://github.com/dev-sarthak7/documind-frontend)

---

## Architecture

```
User Upload
     │
     ▼
Presigned URL ──▶ AWS S3 (direct upload, bypasses backend)
     │
     ▼
Confirm Endpoint ──▶ AWS SQS (async queue)
     │
     ▼
Document Processor (pdf-parse + chunking)
     │
     ├──▶ ChromaDB Cloud (vector embeddings)
     └──▶ MongoDB Atlas (metadata + status)
          │
          ▼
     Chat API ──▶ Gemini 2.5 Flash (RAG answer)
```

### Why this architecture?
- **Presigned URLs** — files go directly from browser to S3, backend never handles binary data
- **SQS** — decouples upload confirmation from processing; prevents HTTP timeout on large PDFs
- **ChromaDB** — purpose-built for vector similarity search; MongoDB alone can't do semantic retrieval efficiently
- **Async processing** — status polling lets users see real-time progress without blocking

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 + ES Modules |
| Framework | Express.js |
| Database | MongoDB Atlas |
| File Storage | AWS S3 |
| Message Queue | AWS SQS |
| Vector DB | ChromaDB Cloud |
| AI / Embeddings | Google Gemini API |
| Auth | JWT + bcryptjs |
| Security | Helmet.js + express-rate-limit |
| Containerization | Docker |
| Deployment | Render |

---

## RAG Pipeline

```
1. UPLOAD    → PDF stored in AWS S3 via presigned URL
2. EXTRACT   → pdf-parse extracts raw text from PDF
3. CHUNK     → Split into 500-word chunks, 50-word overlap
4. EMBED     → Gemini text-embedding-001 → 768-dim vectors
5. STORE     → ChromaDB Cloud (cosine similarity index)
6. QUERY     → User question → embed → top-5 chunk retrieval
7. GENERATE  → Retrieved chunks + question → Gemini 2.5 Flash → answer
```

---

## API Reference

### Auth
```
POST /api/auth/register    Body: { name, email, password }
POST /api/auth/login       Body: { email, password }
GET  /api/auth/me          Header: Authorization: Bearer <token>
```

### Documents
```
POST /api/upload/presigned-url   Body: { fileName, fileType, fileSize }
POST /api/upload/confirm         Body: { documentId }
GET  /api/upload/documents       Returns all documents for logged-in user
GET  /api/documents/:id          Get single document + status
DELETE /api/documents/:id        Delete document + vectors from ChromaDB
```

### Chat
```
POST /api/chat/message           Body: { documentId, question }
GET  /api/chat/history/:docId    Get full conversation history
GET  /api/chat/summary/:docId    Generate AI summary of document
```

---

## Project Structure

```
backend/
├── src/
│   ├── index.js                 # Express app entry point
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── upload.routes.js
│   │   ├── document.routes.js
│   │   └── chat.routes.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── document.controller.js
│   │   └── chat.controller.js
│   ├── services/
│   │   ├── s3.service.js        # AWS S3 presigned URL generation
│   │   ├── sqs.service.js       # AWS SQS message publishing
│   │   ├── rag.service.js       # ChromaDB vector store + retrieval
│   │   ├── chat.service.js      # Gemini chat + RAG query pipeline
│   │   └── processor.service.js # PDF extraction + chunking
│   ├── models/
│   │   ├── User.model.js
│   │   ├── Document.model.js
│   │   └── Chat.model.js
│   └── middleware/
│       └── auth.middleware.js   # JWT verification
├── Dockerfile
├── docker-compose.yml
└── package.json
```

---

## Local Setup

### Prerequisites
- Node.js 20+
- MongoDB Atlas account (free M0 cluster)
- AWS account (S3 + SQS — free tier)
- Google AI Studio API key (free)
- ChromaDB Cloud account (free $5 credits)

### 1. Clone and install
```bash
git clone https://github.com/dev-sarthak7/documind-backend.git
cd documind-backend
npm install
```

### 2. Environment variables
Create a `.env` file:
```env
PORT=8000
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/documind
JWT_SECRET=your_long_random_secret

AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
S3_BUCKET_NAME=your-bucket-name
SQS_QUEUE_URL=https://sqs.ap-south-1.amazonaws.com/account-id/queue-name

GEMINI_API_KEY=your_gemini_key
INTERNAL_SECRET=your_internal_secret

CHROMA_API_KEY=your_chroma_key
CHROMA_TENANT=your_tenant_uuid
CHROMA_DATABASE=your_database_name
```

### 3. Run locally
```bash
npm run dev
```

### 4. Run with Docker
```bash
docker build -t documind-backend .
docker run -p 8000:8000 --env-file .env documind-backend
```

Or with Docker Compose:
```bash
docker-compose up
```

### 5. Test the API
```bash
curl http://localhost:8000/health
# {"status":"ok","message":"DocuMind API running"}
```

---

## Security

- **Helmet.js** — sets 11 HTTP security headers (XSS, MIME sniffing, clickjacking protection)
- **Rate limiting** — 100 req/15min globally, 10 req/15min on auth routes
- **S3 Block Public Access** — files only accessible via presigned URLs (5 min expiry)
- **IAM least privilege** — dedicated IAM user with only S3 + SQS permissions
- **JWT auth** — stateless, 7-day expiry, bcrypt password hashing (10 salt rounds)
- **Internal secret** — service-to-service calls verified with shared secret header

---

## Deployment

Deployed on **Render** free tier. Auto-deploys on push to `main`.

> ⚠️ Free tier spins down after inactivity — first request may take 30-60 seconds.

---

## Author

**Sarthak Satish Borekar** — B.Tech CSE

[GitHub](https://github.com/dev-sarthak7) · [Live Demo](https://documind.sarthaksb.me)

---

## License

MIT
