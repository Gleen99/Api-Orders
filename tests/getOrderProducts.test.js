import { getOrderProducts } from '../controllers/getOrderProducts';
import Order from '../models/orders/OrdersModels';

jest.mock('../models/orders/OrdersModels');

describe('getOrderProducts', () => {
    let req, res;

    beforeEach(() => {
        req = {
            params: { id: 'testOrderId' },
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
    });

    it('should return 404 if order is not found', async () => {
        Order.findById.mockResolvedValue(null);

        await getOrderProducts(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'Commande non trouvée' });
    });

    it('should return products if order is found', async () => {
        const products = [{ _id: 'product1' }, { _id: 'product2' }];
        const order = { _id: 'testOrderId', products };
        Order.findById.mockResolvedValue(order);

        await getOrderProducts(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(products);
    });

    it('should handle errors', async () => {
        const error = new Error('Test Error');
        Order.findById.mockRejectedValue(error);

        await getOrderProducts(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'Erreur serveur', error: 'Test Error' });
    });
});
