import { isValidObjectId } from 'mongoose';
import { rabbitMQClient } from '../../rabbitmq';
import { getOrder } from '../controllers/getOrder';
import Order from '../models/orders/OrdersModels';

jest.mock('../models/orders/OrdersModels');
jest.mock('mongoose', () => ({
    isValidObjectId: jest.fn(),
}));
jest.mock('../../rabbitmq');

describe('getOrder', () => {
    let req, res;

    beforeEach(() => {
        req = {
            params: { id: 'testOrderId' },
            ip: '127.0.0.1',
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        isValidObjectId.mockReturnValue(true);
    });

    it('should return 400 if id is invalid', async () => {
        isValidObjectId.mockReturnValue(false);

        await getOrder(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'ID du order invalide' });
    });

    it('should return 404 if order is not found', async () => {
        Order.findById.mockResolvedValue(null);

        await getOrder(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'Order non trouvé' });
    });

    it('should return the order if found and publish a message', async () => {
        const order = { _id: 'testOrderId' };
        Order.findById.mockResolvedValue(order);
        rabbitMQClient.publishMessage.mockResolvedValue();

        await getOrder(req, res);

        expect(Order.findById).toHaveBeenCalledWith('testOrderId');
        expect(rabbitMQClient.publishMessage).toHaveBeenCalledWith('order_consulte', expect.any(String));
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(order);
    });

    it('should handle errors', async () => {
        const error = new Error('Test Error');
        Order.findById.mockRejectedValue(error);

        await getOrder(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'Erreur serveur' });
    });
});
