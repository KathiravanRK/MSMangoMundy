import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
    id: string;
    timestamp: Date;
    actorId: string;
    actorName: string;
    action: string;
    feature: string;
    description: string;
}

const AuditLogSchema: Schema = new Schema({
    id: { type: String, required: true, unique: true },
    timestamp: { type: Date, default: Date.now },
    actorId: { type: String, required: true },
    actorName: { type: String, required: true },
    action: { type: String, required: true },
    feature: { type: String, required: true },
    description: { type: String, required: true },
});

export default mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
