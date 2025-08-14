import mongoose, { Schema, Document } from 'mongoose';

export interface INote extends Document {
  _id: string;
  slug: string;
  patientId: string;
  visitId?: string;
  authorId: string;
  rawText: string;
  sttLang: string;
  aiSummary: {
    observations?: string;
    risks?: string;
    actions?: string;
  };
  mood: 'happy' | 'sad' | 'anxious' | 'neutral';
  audioUrl?: string;
  createdAt: Date;
}

const noteSchema = new Schema<INote>({
  slug: { type: String, required: true },
  patientId: { type: String, required: true },
  visitId: String,
  authorId: { type: String, required: true },
  rawText: { type: String, required: true },
  sttLang: { type: String, default: 'en' },
  aiSummary: {
    observations: String,
    risks: String,
    actions: String
  },
  mood: { 
    type: String, 
    enum: ['happy', 'sad', 'anxious', 'neutral'], 
    default: 'neutral' 
  },
  audioUrl: String,
  createdAt: { type: Date, default: Date.now }
});

noteSchema.index({ slug: 1, patientId: 1, createdAt: -1 });
noteSchema.index({ slug: 1, authorId: 1, createdAt: -1 });

export default mongoose.models.Note || mongoose.model<INote>('Note', noteSchema);