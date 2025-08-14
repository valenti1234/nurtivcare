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
  photo?: {
    url: string;
    filename: string;
    uploadedAt: Date;
    verified?: boolean;
  };
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
    radius?: number; // in meters, for matching carer shifts
  };
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
  lastVisit: { type: Date },
  photo: {
    url: { type: String },
    filename: { type: String },
    uploadedAt: { type: Date },
    verified: { type: Boolean, default: false }
  },
  location: {
    latitude: { type: Number },
    longitude: { type: Number },
    address: { type: String },
    radius: { type: Number, default: 100 } // default 100 meters
  }
});

patientSchema.index({ slug: 1, lastName: 1 });
patientSchema.index({ slug: 1, createdAt: -1 });

export default mongoose.models.Patient || mongoose.model<IPatient>('Patient', patientSchema);