import mongoose, { Schema, Document } from 'mongoose';

export interface IShift extends Document {
  _id: string;
  userId: mongoose.Types.ObjectId;
  orgId: string;
  patientId?: mongoose.Types.ObjectId;
  checkInTime: Date;
  checkOutTime?: Date;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  notes?: string;
  status: 'active' | 'completed';
  duration?: number; // in minutes
  createdAt: Date;
  updatedAt: Date;
}

const shiftSchema = new Schema<IShift>({
  userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  orgId: { type: String, required: true },
  patientId: { type: Schema.Types.ObjectId, ref: 'Patient' },
  checkInTime: { type: Date, required: true },
  checkOutTime: { type: Date },
  location: {
    latitude: { type: Number },
    longitude: { type: Number },
    address: { type: String }
  },
  notes: { type: String },
  status: { 
    type: String, 
    enum: ['active', 'completed'], 
    default: 'active',
    required: true 
  },
  duration: { type: Number }, // calculated in minutes
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
shiftSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Calculate duration if both check-in and check-out times exist
  if (this.checkInTime && this.checkOutTime) {
    this.duration = Math.round((this.checkOutTime.getTime() - this.checkInTime.getTime()) / (1000 * 60));
    this.status = 'completed';
  }
  
  next();
});

// Indexes for efficient queries
shiftSchema.index({ orgId: 1, userId: 1, createdAt: -1 });
shiftSchema.index({ orgId: 1, status: 1, checkInTime: -1 });
shiftSchema.index({ userId: 1, status: 1 });

export default mongoose.models.Shift || mongoose.model<IShift>('Shift', shiftSchema);