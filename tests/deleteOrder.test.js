import { deleteOrder } from '../controllers/deleteOrder';
import { OrderStatus } from '../enums/orderEnums';
import Order from '../models/orders/OrdersModels';

jest.mock('../models/orders/OrdersModels');

describe('deleteOrder', () => {
    let req, res;

    beforeEach(() => {
        req = {
            params: { orderId: 'testOrderId' },
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
    });

    it('should return 400 if orderId is invalid', async () => {
        req.params.orderId = '';

        await deleteOrder(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Un orderId valide est requis' });
    });

    it('should return 404 if order is not found', async () => {
        Order.findById.mockResolvedValue(null);

        await deleteOrder(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'Commande non trouvée' });
    });

    it('should return 400 if order is shipped or delivered', async () => {
        Order.findById.mockResolvedValue({ status: OrderStatus.SHIPPED });

        await deleteOrder(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Impossible de supprimer une commande expédiée ou livrée' });
    });

    it('should cancel the order if not shipped or delivered', async () => {
        const order = { _id: 'testOrderId', status: OrderStatus.PENDING, save: jest.fn().mockResolvedValue({}) };
        Order.findById.mockResolvedValue(order);

        await deleteOrder(req, res);

        expect(order.status).toBe(OrderStatus.CANCELLED);
        expect(order.save).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ message: 'Commande annulée avec succès', order });
    });

    it('should handle errors', async () => {
        const error = new Error('Test Error');
        Order.findById.mockRejectedValue(error);

        await deleteOrder(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'Erreur lors de la suppression de la commande', error: 'Test Error' });
    });
});
