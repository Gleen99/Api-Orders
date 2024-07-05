import { rabbitMQClient } from '../../rabbitmq';
import { getOrders } from '../controllers/getOrders';
import Order from '../models/orders/OrdersModels';

jest.mock('../models/orders/OrdersModels');
jest.mock('../../rabbitmq');

describe('getOrders', () => {
    let req, res;

    beforeEach(() => {
        req = {
            ip: '127.0.0.1',
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
    });

    it('should return 404 if no orders are found', async () => {
        Order.find.mockResolvedValue([]);

        await getOrders(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'Aucun Client trouvé' });
    });

    it('should return orders and publish a message', async () => {
        const orders = [{ id: 'order1' }, { id: 'order2' }];
        Order.find.mockResolvedValue(orders);
        rabbitMQClient.publishMessage.mockResolvedValue();

        await getOrders(req, res);

        expect(Order.find).toHaveBeenCalled();
        expect(rabbitMQClient.publishMessage).toHaveBeenCalledWith('liste_order_consultee', expect.any(String));
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(orders);
    });

    it('should handle errors', async () => {
        const error = new Error('Test Error');
        Order.find.mockRejectedValue(error);

        await getOrders(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'Erreur serveur' });
    });
});
