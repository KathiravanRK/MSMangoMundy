import mongoose, { Document, Schema } from 'mongoose';

export interface ISupplier extends Document {
    id: string;
    supplierName: string;
    displayName?: string;
    contactNumber: string;
    place?: string;
    outstanding: number;
    bankAccountDetails?: string;
}

const SupplierSchema: Schema = new Schema({
    id: { type: String, required: true, unique: true },
    supplierName: { type: String, required: true },
    displayName: { type: String },
    contactNumber: { type: String, required: true },
    place: { type: String },
    outstanding: { type: Number, default: 0 },
    bankAccountDetails: { type: String },
}, {
    timestamps: true,
    id: false,
    toJSON: {
        virtuals: true,
        transform: function (doc, ret) {
            // Ensure custom id is present
            if (!ret.id && ret._id) {
                ret.id = `s_${ret._id}`;
            }
            // Remove MongoDB _id and __v from JSON output
            delete (ret as any)._id;
            delete (ret as any).__v;
            return ret;
        }
    },
    toObject: {
        virtuals: true,
        transform: function (doc, ret) {
            // Ensure custom id is present
            if (!ret.id && ret._id) {
                ret.id = `s_${ret._id}`;
            }
            // Remove MongoDB _id and __v from object output
            delete (ret as any)._id;
            delete (ret as any).__v;
            return ret;
        }
    }
});

export default mongoose.model<ISupplier>('Supplier', SupplierSchema);
