import { GoogleGenerativeAI } from '@google/generative-ai';
import { queryChunks } from './rag.service.js';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const chatWithDocument = async (documentId, question, chatHistory = []) => {
  // 1. Find relevant chunks from ChromaDB
  const relevantChunks = await queryChunks(documentId, question, 5);

  if (!relevantChunks || relevantChunks.length === 0) {
    return {
      answer: "I couldn't find relevant information in this document to answer your question.",
      sources: [],
    };
  }

  // 2. Build context from chunks
  const context = relevantChunks.join('\n\n---\n\n');

  // 3. Build prompt
  const systemPrompt = `You are a helpful document assistant. Answer the user's question based ONLY on the provided document context. If the answer is not in the context, say so clearly. Be concise and accurate.

Document Context:
${context}`;

  // 4. Build conversation history for Gemini
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const history = chatHistory.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.content }],
  }));

  const chat = model.startChat({
    history: [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'Understood. I will answer questions based only on the provided document context.' }] },
      ...history,
    ],
  });

  const result = await chat.sendMessage(question);
  const answer = result.response.text();

  return { answer, sources: relevantChunks };
};

export const summarizeDocument = async (documentId) => {
  const chunks = await queryChunks(documentId, 'summarize overview main points', 8);

  if (!chunks || chunks.length === 0) {
    return 'Could not generate summary — document may still be processing.';
  }

  const context = chunks.join('\n\n---\n\n');
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const result = await model.generateContent(
    `Summarize the following document in 3-5 clear paragraphs. Highlight the main topics, key points, and important details.\n\nDocument:\n${context}`
  );

  return result.response.text();
};