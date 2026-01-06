import mongoose, { Document, Schema } from 'mongoose';

export interface IBuyer extends Document {
    id: string;
    buyerName: string;
    displayName?: string;
    alias?: string;
    tokenNumber?: string;
    description?: string;
    contactNumber: string;
    place?: string;
    outstanding: number;
}

const BuyerSchema: Schema = new Schema({
    id: { type: String, required: true, unique: true },
    buyerName: { type: String, required: true },
    displayName: { type: String },
    alias: { type: String },
    tokenNumber: { type: String },
    description: { type: String },
    contactNumber: { type: String, required: true },
    place: { type: String },
    outstanding: { type: Number, default: 0 },
}, { timestamps: true, id: false });

export default mongoose.model<IBuyer>('Buyer', BuyerSchema);
