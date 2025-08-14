import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  _id: string;
  slug: string;
  actorId: string;
  action: string;
  entity: string;
  entityId: string;
  meta: Record<string, any>;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>({
  slug: { type: String, required: true },
  actorId: { type: String, required: true },
  action: { type: String, required: true },
  entity: { type: String, required: true },
  entityId: { type: String, required: true },
  meta: { type: Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now }
});

auditLogSchema.index({ slug: 1, createdAt: -1 });
auditLogSchema.index({ slug: 1, entity: 1, entityId: 1 });

export default mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', auditLogSchema);