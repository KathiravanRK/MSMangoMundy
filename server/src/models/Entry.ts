import mongoose, { Document, Schema } from 'mongoose';

export interface IEntryItem {
    id: string;
    subSerialNumber: number;
    productId: string;
    quantity: number;
    grossWeight?: number;
    shuteWeight?: number;
    nettWeight: number;
    ratePerQuantity?: number;
    buyerId?: string;
    subTotal: number;
    invoiceId?: string | null;
    supplierInvoiceId?: string | null;
}

export interface IEntry extends Document {
    id: string;
    serialNumber: string;
    supplierId: string;
    items: IEntryItem[];
    totalQuantities: number;
    totalAmount: number;
    status: string;
    createdAt: Date;
    lastSubSerialNumber: number;
}

const EntryItemSchema: Schema = new Schema({
    id: { type: String, required: true },
    subSerialNumber: { type: Number, required: true },
    productId: { type: String, required: true, ref: 'Product' },
    quantity: { type: Number, required: true },
    grossWeight: { type: Number },
    shuteWeight: { type: Number },
    nettWeight: { type: Number, required: true },
    ratePerQuantity: { type: Number },
    buyerId: { type: String, ref: 'Buyer' },
    subTotal: { type: Number, required: true, default: 0 },
    invoiceId: { type: String, ref: 'Invoice', default: null },
    supplierInvoiceId: { type: String, ref: 'SupplierInvoice', default: null },
});

const EntrySchema: Schema = new Schema({
    id: { type: String, required: true, unique: true },
    serialNumber: { type: String, required: true },
    supplierId: { type: String, required: true, ref: 'Supplier' },
    items: [EntryItemSchema],
    totalQuantities: { type: Number, required: true, default: 0 },
    totalAmount: { type: Number, required: true, default: 0 },
    status: { type: String, required: true, enum: ['Pending', 'Draft', 'Auctioned', 'Invoiced', 'Cancelled'], default: 'Pending' },
    lastSubSerialNumber: { type: Number, default: 0 },
}, { timestamps: true, id: false });

export default mongoose.model<IEntry>('Entry', EntrySchema);
