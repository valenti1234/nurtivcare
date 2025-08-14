import mongoose, { Schema, Document } from 'mongoose';

export interface IVisit extends Document {
  _id: string;
  slug: string;
  patientId: string;
  carerId: string;
  startedAt: Date;
  endedAt?: Date;
  location?: string;
  createdAt: Date;
}

const visitSchema = new Schema<IVisit>({
  slug: { type: String, required: true },
  patientId: { type: String, required: true },
  carerId: { type: String, required: true },
  startedAt: { type: Date, required: true },
  endedAt: Date,
  location: String,
  createdAt: { type: Date, default: Date.now }
});

visitSchema.index({ slug: 1, patientId: 1, startedAt: -1 });
visitSchema.index({ slug: 1, carerId: 1, startedAt: -1 });

export default mongoose.models.Visit || mongoose.model<IVisit>('Visit', visitSchema);