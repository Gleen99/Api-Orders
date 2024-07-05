import { rabbitMQClient } from '../../rabbitmq';
import { createOrder } from '../controllers/createOrder';
import Order from '../models/orders/OrdersModels';
import { getProductDetails } from '../services/OrderServices';

jest.mock('../models/orders/OrdersModels');
jest.mock('../services/OrderServices');
jest.mock('../../rabbitmq');

describe('createOrder', () => {
    let req, res;

    beforeEach(() => {
        req = {
            params: { customerId: 'testCustomerId', productIds: 'product1,product2' },
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
    });

    it('should return 400 if no valid productIds are provided', async () => {
        req.params.productIds = '';

        await createOrder(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Au moins un productId valide est requis' });
    });

    it('should return 409 if an order with the same customerId and products already exists', async () => {
        Order.findOne.mockResolvedValue({ _id: 'existingOrderId' });

        await createOrder(req, res);

        expect(Order.findOne).toHaveBeenCalledWith({
            customerId: 'testCustomerId',
            'products._id': { $all: ['product1', 'product2'] }
        });
        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith({ message: 'Une commande avec ces produits existe déjà pour ce client' });
    });

    it('should return 404 if no product details are found', async () => {
        Order.findOne.mockResolvedValue(null);
        getProductDetails.mockResolvedValue([]);

        await createOrder(req, res);

        expect(getProductDetails).toHaveBeenCalledWith(['product1', 'product2']);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'Aucun produit trouvé avec les IDs fournis' });
    });

    it('should create a new order and publish a message', async () => {
        Order.findOne.mockResolvedValue(null);
        const productsDetails = [{ _id: 'product1' }, { _id: 'product2' }];
        getProductDetails.mockResolvedValue(productsDetails);
        const newOrder = { _id: 'newOrderId', customerId: 'testCustomerId', products: productsDetails, createdAt: new Date() };
        Order.prototype.save = jest.fn().mockResolvedValue(newOrder);
        rabbitMQClient.publishMessage.mockResolvedValue();

        await createOrder(req, res);

        expect(Order.findOne).toHaveBeenCalledWith({
            customerId: 'testCustomerId',
            'products._id': { $all: ['product1', 'product2'] }
        });
        expect(getProductDetails).toHaveBeenCalledWith(['product1', 'product2']);
        expect(Order.prototype.save).toHaveBeenCalled();
        expect(rabbitMQClient.publishMessage).toHaveBeenCalledWith('order_created', expect.any(String));
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(newOrder);
    });

    it('should handle errors', async () => {
        const error = new Error('Test Error');
        Order.findOne.mockRejectedValue(error);

        await createOrder(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'Erreur lors de la création de la commande', error: 'Test Error' });
    });

    it('should handle product details timeout error', async () => {
        const error = new Error('Timeout en attendant la réponse des détails des produits');
        Order.findOne.mockResolvedValue(null);
        getProductDetails.mockRejectedValue(error);

        await createOrder(req, res);

        expect(res.status).toHaveBeenCalledWith(504);
        expect(res.json).toHaveBeenCalledWith({ message: "Délai d'attente dépassé pour la récupération des détails des produits" });
    });
});
