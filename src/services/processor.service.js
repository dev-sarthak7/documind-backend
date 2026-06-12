import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { createRequire } from 'module';
import { storeChunks } from './rag.service.js';
import Document from '../models/Document.model.js';
import dotenv from 'dotenv';
dotenv.config();

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const streamToBuffer = async (stream) => {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
};

const chunkText = (text, chunkSize = 500, overlap = 50) => {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks = [];
  let i = 0;
  while (i < words.length) {
    chunks.push(words.slice(i, i + chunkSize).join(' '));
    i += chunkSize - overlap;
  }
  return chunks;
};

export const processDocument = async (documentId, fileKey, fileType) => {
  try {
    console.log(`Processing document: ${documentId}`);

    // Download from S3
    const s3Response = await s3.send(new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileKey,
    }));
    const fileBuffer = await streamToBuffer(s3Response.Body);

    // Extract text
    let extractedText = '';
    if (fileType === 'application/pdf') {
      const parsed = await pdfParse(fileBuffer);
      extractedText = parsed.text;
    } else {
      extractedText = fileBuffer.toString('utf-8');
    }

    // Chunk and store in ChromaDB
    const chunks = chunkText(extractedText);
    console.log(`Extracted ${chunks.length} chunks`);
    await storeChunks(documentId, chunks);

    // Update status to ready
    await Document.findByIdAndUpdate(documentId, {
      status: 'ready',
      pageCount: chunks.length,
    });

    console.log(`Document ${documentId} ready`);
  } catch (err) {
    console.error(`Processing failed for ${documentId}:`, err.message);
    await Document.findByIdAndUpdate(documentId, { status: 'failed' });
  }
};