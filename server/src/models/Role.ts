import mongoose, { Document, Schema } from 'mongoose';

export interface IRole extends Document {
    id: string;
    name: string;
    permissions: Record<string, boolean>;
}

const RoleSchema: Schema = new Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    permissions: { type: Schema.Types.Mixed, required: true, default: {} },
}, { timestamps: true });

export default mongoose.model<IRole>('Role', RoleSchema);
