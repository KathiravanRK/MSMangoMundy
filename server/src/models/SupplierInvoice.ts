import mongoose, { Document, Schema } from 'mongoose';

export interface ISupplierInvoiceItem {
    productId: string;
    productName: string;
    quantity: number;
    grossWeight?: number;
    shuteWeight?: number;
    nettWeight: number;
    ratePerQuantity: number;
    subTotal: number;
}

export interface ISupplierInvoice extends Document {
    id: string;
    invoiceNumber: string;
    supplierId: string;
    entryIds: string[];
    items: ISupplierInvoiceItem[];
    totalQuantities: number;
    grossTotal: number;
    commissionRate: number;
    commissionAmount: number;
    wages: number;
    adjustments: number;
    nettAmount: number;
    advancePaid: number;
    finalPayable: number;
    paidAmount: number;
    status: string;
    createdAt: Date;
}

const SupplierInvoiceItemSchema: Schema = new Schema({
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true },
    grossWeight: { type: Number },
    shuteWeight: { type: Number },
    nettWeight: { type: Number, required: true },
    ratePerQuantity: { type: Number, required: true },
    subTotal: { type: Number, required: true },
});

const SupplierInvoiceSchema: Schema = new Schema({
    id: { type: String, required: true, unique: true },
    invoiceNumber: { type: String, required: true, unique: true },
    supplierId: { type: String, required: true, ref: 'Supplier' },
    entryIds: [{ type: String, ref: 'Entry' }],
    items: [SupplierInvoiceItemSchema],
    totalQuantities: { type: Number, required: true },
    grossTotal: { type: Number, required: true },
    commissionRate: { type: Number, required: true },
    commissionAmount: { type: Number, required: true },
    wages: { type: Number, default: 0 },
    adjustments: { type: Number, default: 0 },
    nettAmount: { type: Number, required: true },
    advancePaid: { type: Number, default: 0 },
    finalPayable: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    status: { type: String, enum: ['Paid', 'Unpaid', 'Partially Paid'], default: 'Unpaid' },
}, { timestamps: true });

export default mongoose.model<ISupplierInvoice>('SupplierInvoice', SupplierInvoiceSchema);
