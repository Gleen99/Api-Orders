import { updateOrder } from '../controllers/updateOrder';
import { OrderStatus } from '../enums/orderEnums';
import Order from '../models/orders/OrdersModels';
import { addProductsToOrder, removeProductsFromOrder, updateOrderStatus } from '../services/OrderServices';
import { validateUpdateOrder } from '../validator/validationOrders';

jest.mock('../models/orders/OrdersModels');
jest.mock('../services/OrderServices');
jest.mock('../validator/validationOrders');

describe('updateOrder', () => {
    let req, res;

    beforeEach(() => {
        req = {
            params: { orderId: 'testOrderId' },
            body: { productIds: ['product1'], action: 'add', status: 'PENDING' },
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        validateUpdateOrder.mockReturnValue({ error: null });
    });

    it('should return 400 if validation fails', async () => {
        validateUpdateOrder.mockReturnValue({ error: { details: [{ message: 'Validation error' }] } });

        await updateOrder(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: ['Validation error'] });
    });

    it('should return 400 if orderId is invalid', async () => {
        req.params.orderId = '';

        await updateOrder(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Un orderId valide est requis' });
    });

    it('should return 404 if order is not found', async () => {
        Order.findById.mockResolvedValue(null);

        await updateOrder(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'Commande non trouvée' });
    });

    it('should update status of a cancelled order to pending', async () => {
        const order = { _id: 'testOrderId', status: OrderStatus.CANCELLED, save: jest.fn().mockResolvedValue({}) };
        Order.findById.mockResolvedValue(order);

        req.body = { action: 'updateStatus', status: 'PENDING' };

        await updateOrder(req, res);

        expect(order.status).toBe(OrderStatus.PENDING);
        expect(order.save).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(order);
    });

    it('should return 400 if trying to modify a cancelled order without reactivating', async () => {
        const order = { _id: 'testOrderId', status: OrderStatus.CANCELLED };
        Order.findById.mockResolvedValue(order);

        req.body = { action: 'add', productIds: ['product1'] };

        await updateOrder(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Impossible de modifier une commande annulée sauf pour la réactiver' });
    });

    it('should add products to the order', async () => {
        const order = { _id: 'testOrderId', status: OrderStatus.PENDING, save: jest.fn().mockResolvedValue({}) };
        Order.findById.mockResolvedValue(order);

        await updateOrder(req, res);

        expect(addProductsToOrder).toHaveBeenCalledWith(order, ['product1']);
        expect(order.save).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(order);
    });

    it('should remove products from the order', async () => {
        const order = { _id: 'testOrderId', status: OrderStatus.PENDING, save: jest.fn().mockResolvedValue({}) };
        Order.findById.mockResolvedValue(order);

        req.body = { action: 'remove', productIds: ['product1'] };

        await updateOrder(req, res);

        expect(removeProductsFromOrder).toHaveBeenCalledWith(order, ['product1']);
        expect(order.save).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(order);
    });

    it('should update order status', async () => {
        const order = { _id: 'testOrderId', status: OrderStatus.PENDING, save: jest.fn().mockResolvedValue({}) };
        Order.findById.mockResolvedValue(order);

        req.body = { action: 'updateStatus', status: 'SHIPPED' };

        await updateOrder(req, res);

        expect(updateOrderStatus).toHaveBeenCalledWith(order, 'SHIPPED');
        expect(order.save).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(order);
    });

    it('should return 400 if trying to set status to CANCELLED directly', async () => {
        const order = { _id: 'testOrderId', status: OrderStatus.PENDING };
        Order.findById.mockResolvedValue(order);

        req.body = { action: 'updateStatus', status: 'CANCELLED' };

        await updateOrder(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Impossible de passer une commande au statut CANCELLED via cette méthode' });
    });

    it('should handle errors', async () => {
        const error = new Error('Test Error');
        Order.findById.mockRejectedValue(error);

        await updateOrder(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'Erreur lors de la mise à jour de la commande', error: 'Test Error' });
    });
});
