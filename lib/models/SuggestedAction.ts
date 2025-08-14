import mongoose, { Schema, Document } from 'mongoose';

export interface ISuggestedAction extends Document {
  _id: string;
  slug: string;
  patientId: string;
  noteId?: string;
  text: string;
  status: 'pending' | 'done';
  createdAt: Date;
}

const suggestedActionSchema = new Schema<ISuggestedAction>({
  slug: { type: String, required: true },
  patientId: { type: String, required: true },
  noteId: { type: String, required: false },
  text: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'done'], 
    default: 'pending' 
  },
  createdAt: { type: Date, default: Date.now }
});

suggestedActionSchema.index({ slug: 1, patientId: 1, status: 1 });
suggestedActionSchema.index({ slug: 1, status: 1, createdAt: -1 });

export default mongoose.models.SuggestedAction || mongoose.model<ISuggestedAction>('SuggestedAction', suggestedActionSchema);