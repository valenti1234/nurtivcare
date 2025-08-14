import mongoose, { Schema, Document } from 'mongoose';

export interface IMembership extends Document {
  _id: string;
  userId: mongoose.Types.ObjectId;
  slug: string;
  role: 'OWNER' | 'ADMIN' | 'CARER' | 'VIEWER';
  createdAt: Date;
}

const membershipSchema = new Schema<IMembership>({
  userId: { type: Schema.Types.ObjectId, required: true },
  slug: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['OWNER', 'ADMIN', 'CARER', 'VIEWER'], 
    required: true 
  },
  createdAt: { type: Date, default: Date.now }
});

membershipSchema.index({ userId: 1, slug: 1 }, { unique: true });
membershipSchema.index({ slug: 1, role: 1 });

export default mongoose.models.Membership || mongoose.model<IMembership>('Membership', membershipSchema);