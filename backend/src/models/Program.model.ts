import mongoose, { Document, Schema } from 'mongoose';

export interface IMilestone {
  _id?: mongoose.Types.ObjectId;
  title: string;
  dueDate: Date;
  status: 'pending' | 'in_progress' | 'completed';
  description?: string;
}

export interface IInitiative {
  _id?: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  status: 'planned' | 'active' | 'completed';
  ownerId?: mongoose.Types.ObjectId;
}

export interface IProgram extends Document {
  name: string;
  description?: string;
  milestones: IMilestone[];
  initiatives: IInitiative[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MilestoneSchema = new Schema<IMilestone>({
  title: { type: String, required: true },
  dueDate: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
  description: String,
});

const InitiativeSchema = new Schema<IInitiative>({
  title: { type: String, required: true },
  description: String,
  status: { type: String, enum: ['planned', 'active', 'completed'], default: 'planned' },
  ownerId: Schema.Types.ObjectId,
});

const ProgramSchema = new Schema<IProgram>({
  name: { type: String, required: true },
  description: String,
  milestones: [MilestoneSchema],
  initiatives: [InitiativeSchema],
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

ProgramSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model<IProgram>('Program', ProgramSchema);
