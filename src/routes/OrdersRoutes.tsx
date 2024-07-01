import express from 'express';
import { getOrders } from '../controllers/getOrders';
import { getOrder } from '../controllers/getOrder';
import { createOrder } from '../controllers/createOrder';
import { updateOrder } from '../controllers/updateOrder';
import { deleteOrder } from '../controllers/deleteOrder';
import { getOrderProducts } from '../controllers/getOrderProducts';
import { getOrderProduct } from '../controllers/getOrderProduct';

const router = express.Router();

router.get('/', getOrders);

router.get('/:id', getOrder);

router.post('/:customerId/:productIds', createOrder);

router.put('/:orderId', updateOrder);

router.delete('/:orderId', deleteOrder);

router.get('/:id/products', getOrderProducts);

router.get('/:id/products/:productId', getOrderProduct);

export default router;
