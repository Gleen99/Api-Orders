import mongoose, {Schema, Document, Model, ObjectId} from 'mongoose';
import {OrderStatus} from "../../enums/orderEnums";

export interface IProduct {
    _id: ObjectId
    name: string;
    details: {
        price: number;
        description: string;
        color: string;
    };
    stock: number;
    createdAt: Date;
    orderId: ObjectId;
}

export interface IOrder extends Document {
    _id: ObjectId;
    customerId: ObjectId;
    products: IProduct[];
    status: OrderStatus;
    createdAt: Date;
}

const ProductSchema: Schema = new Schema({
    _id: { type: Schema.Types.ObjectId, auto: true },
    name: { type: String, required: true },
    details: {
        price: { type: Number, required: true },
        description: { type: String, required: true },
        color: { type: String, required: true }
    },
    stock: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
    orderId: { type: Schema.Types.ObjectId, required: true }
});


const OrderSchema: Schema = new Schema({
customerId: { type: Schema.Types.ObjectId, required: true },
    products: [ProductSchema],
    status: { type: String, enum: Object.values(OrderStatus) },
    createdAt: { type: Date, default: Date.now }
});

const Order: Model<IOrder> = mongoose.model<IOrder>('Order', OrderSchema);

export default Order;