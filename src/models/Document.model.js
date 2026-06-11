import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fileName: { type: String, required: true },
  fileKey: { type: String, required: true }, // S3 key
  fileType: { type: String, required: true },
  fileSize: { type: Number },
  status: {
    type: String,
    enum: ['uploaded', 'processing', 'ready', 'failed'],
    default: 'uploaded'
  },
  pageCount: { type: Number },
  summary: { type: String },
}, { timestamps: true });

export default mongoose.model('Document', documentSchema);