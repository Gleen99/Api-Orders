import { getOrderProduct } from '../controllers/getOrderProduct';
import Order from '../models/orders/OrdersModels';

jest.mock('../models/orders/OrdersModels');

describe('getOrderProduct', () => {
    let req, res;

    beforeEach(() => {
        req = {
            params: { id: 'testOrderId', productId: 'testProductId' },
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
    });

    it('should return 404 if order is not found', async () => {
        Order.findById.mockResolvedValue(null);

        await getOrderProduct(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'Commande non trouvée' });
    });

    it('should return 404 if product is not found in the order', async () => {
        const order = { _id: 'testOrderId', products: [] };
        Order.findById.mockResolvedValue(order);

        await getOrderProduct(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'Produit non trouvé dans cette commande' });
    });

    it('should return the product if found in the order', async () => {
        const product = { _id: 'testProductId' };
        const order = { _id: 'testOrderId', products: [product] };
        Order.findById.mockResolvedValue(order);

        await getOrderProduct(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(product);
    });

    it('should handle errors', async () => {
        const error = new Error('Test Error');
        Order.findById.mockRejectedValue(error);

        await getOrderProduct(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'Erreur serveur', error: 'Test Error' });
    });
});
