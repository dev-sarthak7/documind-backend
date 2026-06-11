import { ChromaClient } from 'chromadb';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const chroma = new ChromaClient({ path: 'http://localhost:8001' });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Get or create a collection for a document
const getCollection = async (documentId) => {
  return await chroma.getOrCreateCollection({
    name: `doc_${documentId}`,
    metadata: { hnsw_space: 'cosine' },
  });
};

// Generate embedding for a single text using Gemini
const generateEmbedding = async (text) => {
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const result = await model.embedContent(text);
  return result.embedding.values;
};

// Store all chunks with embeddings for a document
export const storeChunks = async (documentId, chunks) => {
  const collection = await getCollection(documentId);

  const embeddings = [];
  const documents = [];
  const ids = [];

  for (let i = 0; i < chunks.length; i++) {
    const embedding = await generateEmbedding(chunks[i]);
    embeddings.push(embedding);
    documents.push(chunks[i]);
    ids.push(`${documentId}_chunk_${i}`);
  }

  await collection.add({ ids, embeddings, documents });
  console.log(`Stored ${chunks.length} chunks for document ${documentId}`);
};

// Query: find top-k relevant chunks for a question
export const queryChunks = async (documentId, question, topK = 5) => {
  const collection = await getCollection(documentId);
  const questionEmbedding = await generateEmbedding(question);

  const results = await collection.query({
    queryEmbeddings: [questionEmbedding],
    nResults: topK,
  });

  return results.documents[0]; // array of relevant chunks
};

// Delete all chunks for a document
export const deleteChunks = async (documentId) => {
  try {
    await chroma.deleteCollection({ name: `doc_${documentId}` });
  } catch (err) {
    console.log(`No collection found for document ${documentId}`);
  }
};