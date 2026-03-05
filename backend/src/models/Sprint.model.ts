import mongoose, { Document, Schema } from 'mongoose';

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';

export interface ITask {
  _id?: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  status: TaskStatus;
  assigneeId?: mongoose.Types.ObjectId;
  storyPoints?: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  updatedAt: Date;
}

export interface ISprint extends Document {
  name: string;
  programId: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  goal?: string;
  tasks: ITask[];
  status: 'planned' | 'active' | 'completed';
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>({
  title: { type: String, required: true },
  description: String,
  status: { type: String, enum: ['todo', 'in_progress', 'review', 'done'], default: 'todo' },
  assigneeId: { type: Schema.Types.ObjectId, ref: 'User' },
  storyPoints: Number,
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const SprintSchema = new Schema<ISprint>({
  name: { type: String, required: true },
  programId: { type: Schema.Types.ObjectId, ref: 'Program', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  goal: String,
  tasks: [TaskSchema],
  status: { type: String, enum: ['planned', 'active', 'completed'], default: 'planned' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

SprintSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model<ISprint>('Sprint', SprintSchema);
