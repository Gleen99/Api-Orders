import { Request, Response } from 'express';
import Order, { IOrder, IProduct } from "../models/orders/OrdersModels";
import {getProductDetailsWithRetry} from "../services/OrderServices";
import {rabbitMQClient} from "../../rabbitmq";
export const createOrder = async (req: Request, res: Response) => {
    const { customerId } = req.params;
    const { productIds } = req.params;

    console.log("customerId", customerId);
    console.log("productIds", productIds);

    if (!productIds || productIds.length === 0) {
        return res.status(400).json({ message: 'Au moins un productId valide est requis' });
    }

    const productIdsArray = productIds.split(',').filter(id => id.trim() !== '');

    if (productIdsArray.length === 0) {
        return res.status(400).json({ message: 'Au moins un productId valide est requis' });
    }

    console.log("productIdsArray", productIdsArray);

    try {
        const existingOrder = await Order.findOne({
            customerId,
            'products._id': { $all: productIdsArray }
        });

        if (existingOrder) {
            return res.status(409).json({ message: 'Une commande avec ces produits existe déjà pour ce client' });
        }

        const productsDetails: IProduct[] = await getProductDetailsWithRetry(productIdsArray);

        if (productsDetails.length === 0) {
            return res.status(404).json({message: 'Aucun produit trouvé avec les IDs fournis'});
        }

        // Create the order without setting orderId for products
        const newOrder: IOrder = new Order({
            customerId,
            products: productsDetails.map(product => ({ ...product, orderId: undefined })),
            createdAt: new Date()
        });

        await newOrder.save();

        newOrder.products = newOrder.products.map(product => ({
            ...product,
            orderId: newOrder._id
        }));


        await newOrder.save();

        // Save the order again with updated products
        await newOrder.save();

        await rabbitMQClient.publishMessage('order_created', JSON.stringify({
            orderId: newOrder._id,
            customerId: newOrder.customerId,
            createdAt: newOrder.createdAt
        }));

        return res.status(201).json(newOrder);

    } catch (error: any) {
        console.error('Erreur lors de la création de la commande:', error);
        if (error.message.includes('Aucun produit trouvé')) {
            return res.status(404).json({message: error.message});
        }
        if (error.message === 'Timeout en attendant la réponse des détails des produits') {
            return res.status(504).json({message: "Délai d'attente dépassé pour la récupération des détails des produits"});
        }
        return res.status(500).json({message: 'Erreur lors de la création de la commande', error: error.message});
    }
}


