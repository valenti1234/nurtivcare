import mongoose, { Schema, Document } from 'mongoose';

export interface IOrganisation extends Document {
  _id: string;
  name: string;
  slug: string;
  timezone: string;
  plan: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  dataResidency: 'UK' | 'EU';
  createdAt: Date;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  maxSeats: number;
  maxSttMinutes: number;
}

const organisationSchema = new Schema<IOrganisation>({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  timezone: { type: String, default: 'Europe/London' },
  plan: { 
    type: String, 
    enum: ['STARTER', 'PROFESSIONAL', 'ENTERPRISE'], 
    default: 'STARTER' 
  },
  dataResidency: { 
    type: String, 
    enum: ['UK', 'EU'], 
    default: 'UK' 
  },
  stripeCustomerId: String,
  stripeSubscriptionId: String,
  maxSeats: { type: Number, default: 3 },
  maxSttMinutes: { type: Number, default: 60 },
  createdAt: { type: Date, default: Date.now }
});



export default mongoose.models.Organisation || mongoose.model<IOrganisation>('Organisation', organisationSchema);