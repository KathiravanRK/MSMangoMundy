import mongoose, { Document, Schema } from 'mongoose';

export interface ICashFlowTransaction extends Document {
    id: string;
    date: Date;
    type: string;
    category: string | null;
    entityId: string | null;
    entityName: string;
    amount: number;
    discount?: number;
    method: string;
    toMethod?: string;
    reference?: string;
    description?: string;
    relatedEntryIds?: string[];
    relatedInvoiceIds?: string[];
}

const CashFlowTransactionSchema: Schema = new Schema({
    id: { type: String, required: true, unique: true },
    date: { type: Date, required: true },
    type: { type: String, required: true, enum: ['Income', 'Expense', 'Transfer'] },
    category: { type: String, default: null },
    entityId: { type: String, default: null },
    entityName: { type: String, required: true },
    amount: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    method: { type: String, required: true, enum: ['Cash', 'Bank'] },
    toMethod: { type: String, enum: ['Cash', 'Bank'] }, // For Transfer
    reference: { type: String },
    description: { type: String },
    relatedEntryIds: [{ type: String }],
    relatedInvoiceIds: [{ type: String }],
}, { timestamps: true });

export default mongoose.model<ICashFlowTransaction>('CashFlowTransaction', CashFlowTransactionSchema);
