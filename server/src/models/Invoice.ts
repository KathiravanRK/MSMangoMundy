import mongoose, { Document, Schema } from 'mongoose';

export interface IInvoiceItem {
    id: string; // EntryItem id
    productId: string;
    productName: string;
    quantity: number;
    grossWeight?: number;
    shuteWeight?: number;
    nettWeight: number;
    ratePerQuantity: number;
    subTotal: number;
}

export interface IInvoice extends Document {
    id: string;
    invoiceNumber: string;
    buyerId: string;
    items: IInvoiceItem[];
    totalQuantities: number;
    totalAmount: number;
    wages: number;
    adjustments: number;
    nettAmount: number;
    paidAmount: number;
    discount: number;
    createdAt: Date;
}

const InvoiceItemSchema: Schema = new Schema({
    id: { type: String, required: true },
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true },
    grossWeight: { type: Number },
    shuteWeight: { type: Number },
    nettWeight: { type: Number, required: true },
    ratePerQuantity: { type: Number, required: true },
    subTotal: { type: Number, required: true },
});

const InvoiceSchema: Schema = new Schema({
    id: { type: String, required: true, unique: true },
    invoiceNumber: { type: String, required: true, unique: true },
    buyerId: { type: String, required: true, ref: 'Buyer' },
    items: [InvoiceItemSchema],
    totalQuantities: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    wages: { type: Number, default: 0 },
    adjustments: { type: Number, default: 0 },
    nettAmount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
}, { timestamps: true, id: false });

export default mongoose.model<IInvoice>('Invoice', InvoiceSchema);
