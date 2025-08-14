import mongoose, { Schema, Document } from 'mongoose';

export interface IPatient extends Document {
  _id: string;
  slug: string;
  firstName: string;
  lastName: string;
  dob: Date;
  keyInfo: Record<string, any>;
  carePlan: string;
  createdAt: Date;
  status?: string;
  riskLevel?: string;
  lastAnalyzed?: Date;
  analysisReasoning?: string;
  analysisRecommendations?: string[];
  conditions?: string[];
  allergies?: string;
  emergencyContact?: string;
  gp?: string;
  lastVisit?: Date;
}

const patientSchema = new Schema<IPatient>({
  slug: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  dob: { type: Date, required: true },
  keyInfo: { type: Schema.Types.Mixed, default: {} },
  carePlan: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  status: { type: String },
  riskLevel: { type: String },
  lastAnalyzed: { type: Date },
  analysisReasoning: { type: String },
  analysisRecommendations: [{ type: String }],
  conditions: [{ type: String }],
  allergies: { type: String },
  emergencyContact: { type: String },
  gp: { type: String },
  lastVisit: { type: Date }
});

patientSchema.index({ slug: 1, lastName: 1 });
patientSchema.index({ slug: 1, createdAt: -1 });

export default mongoose.models.Patient || mongoose.model<IPatient>('Patient', patientSchema);