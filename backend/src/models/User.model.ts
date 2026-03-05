import mongoose, { Document, Schema } from 'mongoose';

export type Role = 'manager' | 'engineer';

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  role: Role;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['manager', 'engineer'], default: 'engineer' },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IUser>('User', UserSchema);
