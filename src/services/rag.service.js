import { ChromaClient } from 'chromadb';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const getChromaClient = () => {
  if (process.env.CHROMA_API_KEY) {
  return new ChromaClient({
    ssl: true,
    host: 'api.trychroma.com',
    port: 443,
    tenant: process.env.CHROMA_TENANT,
    database: process.env.CHROMA_DATABASE,
    headers: { 'x-chroma-token': process.env.CHROMA_API_KEY },
  });
}
  return new ChromaClient({
    ssl: false,
    host: 'localhost',
    port: 8001,
    tenant: 'default_tenant',
    database: 'default_database',
  });
};

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const generateEmbedding = async (text) => {
  const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
  const result = await model.embedContent(text);
  return result.embedding.values;
};

export const storeChunks = async (documentId, chunks) => {
  const chroma = getChromaClient();
  const collection = await chroma.getOrCreateCollection({
    name: `doc${documentId}`,
    metadata: { hnsw_space: 'cosine' },
  });

  const embeddings = [];
  const documents = [];
  const ids = [];

  for (let i = 0; i < chunks.length; i++) {
    const embedding = await generateEmbedding(chunks[i]);
    embeddings.push(embedding);
    documents.push(chunks[i]);
    ids.push(`${documentId}chunk${i}`);
  }

  await collection.add({ ids, embeddings, documents });
  console.log(`Stored ${chunks.length} chunks for document ${documentId}`);
};

export const queryChunks = async (documentId, question, topK = 5) => {
  const chroma = getChromaClient();
  const collection = await chroma.getOrCreateCollection({
    name: `doc${documentId}`,
    metadata: { hnsw_space: 'cosine' },
  });
  const questionEmbedding = await generateEmbedding(question);
  const results = await collection.query({
    queryEmbeddings: [questionEmbedding],
    nResults: topK,
  });
  return results.documents[0];
};

export const deleteChunks = async (documentId) => {
  try {
    const chroma = getChromaClient();
    await chroma.deleteCollection({ name: `doc${documentId}` });
  } catch (err) {
    console.log(`No collection found for document ${documentId}`);
  }
};
