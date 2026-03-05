import mongoose, { Document, Schema } from 'mongoose';

export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface IRisk extends Document {
  title: string;
  description?: string;
  severity: RiskSeverity;
  status: 'open' | 'mitigating' | 'resolved' | 'accepted';
  mitigationPlan?: string;
  programId: mongoose.Types.ObjectId;
  reportedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RiskSchema = new Schema<IRisk>({
  title: { type: String, required: true },
  description: String,
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
  status: { type: String, enum: ['open', 'mitigating', 'resolved', 'accepted'], default: 'open' },
  mitigationPlan: String,
  programId: { type: Schema.Types.ObjectId, ref: 'Program', required: true },
  reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

RiskSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model<IRisk>('Risk', RiskSchema);
