import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
    id: string;
    productName: string;
    displayName?: string;
}

const ProductSchema: Schema = new Schema({
    id: { type: String, required: true, unique: true },
    productName: { type: String, required: true },
    displayName: { type: String },
}, {
    timestamps: true,
    id: false,
    toJSON: {
        virtuals: true,
        transform: function (doc, ret) {
            // Ensure custom id is present
            if (!ret.id && ret._id) {
                ret.id = `p_${ret._id}`;
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
                ret.id = `p_${ret._id}`;
            }
            // Remove MongoDB _id and __v from object output
            delete (ret as any)._id;
            delete (ret as any).__v;
            return ret;
        }
    }
});

export default mongoose.model<IProduct>('Product', ProductSchema);
