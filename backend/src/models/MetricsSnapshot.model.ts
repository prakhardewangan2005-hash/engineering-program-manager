import mongoose, { Document, Schema } from 'mongoose';

export interface IMetricsSnapshot extends Document {
  programId: mongoose.Types.ObjectId;
  sprintId?: mongoose.Types.ObjectId;
  periodStart: Date;
  periodEnd: Date;
  velocity: number;           // story points completed
  deploymentFrequency: number;
  bugRate: number;            // bugs per sprint or period
  featureCompletionPercent: number;
  createdAt: Date;
}

const MetricsSnapshotSchema = new Schema<IMetricsSnapshot>({
  programId: { type: Schema.Types.ObjectId, ref: 'Program', required: true },
  sprintId: { type: Schema.Types.ObjectId, ref: 'Sprint' },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  velocity: { type: Number, default: 0 },
  deploymentFrequency: { type: Number, default: 0 },
  bugRate: { type: Number, default: 0 },
  featureCompletionPercent: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IMetricsSnapshot>('MetricsSnapshot', MetricsSnapshotSchema);
