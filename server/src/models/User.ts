import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
    id: string;
    name: string;
    contactNumber: string;
    password?: string;
    roleId: string;
}

const UserSchema: Schema = new Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    contactNumber: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    roleId: { type: String, required: true, ref: 'Role' },
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);
