import { Request, Response } from 'express';
import Order, { IOrder, IProduct } from "../models/orders/OrdersModels";

import { validateCreateOrderParams } from "../validator/validationOrders";
import {getProductDetails} from "../services/OrderServices";
import {rabbitMQClient} from "../../rabbitmq";

export const createOrder = async (req: Request, res: Response) => {
    const { customerId, productIds } = req.params;

    console.log("customerId", customerId);
    console.log("productIds", productIds);

    // Séparer les productIds et filtrer les valeurs vides
    const productIdsArray = productIds.split(',').filter(id => id.trim() !== '');

    if (productIdsArray.length === 0) {
        return res.status(400).json({ message: 'Au moins un productId valide est requis' });
    }

    console.log("productIdsArray", productIdsArray);

    try {
        // Check if an order with the same customerId and products already exists
        const existingOrder = await Order.findOne({
            customerId,
            'products._id': { $all: productIdsArray }
        });

        if (existingOrder) {
            return res.status(409).json({ message: 'Une commande avec ces produits existe déjà pour ce client' });
        }

        // Récupérer les détails des produits avant de créer la commande
        const productsDetails: IProduct[] = await getProductDetails(productIdsArray);

        if (productsDetails.length === 0) {
            return res.status(404).json({message: 'Aucun produit trouvé avec les IDs fournis'});
        }

        // Créer une nouvelle instance de commande
        const newOrder: IOrder = new Order({
            customerId,
            products: productsDetails,
            createdAt: new Date()
        });

        // Sauvegarder la commande
        await newOrder.save();

        // Publier un message pour informer le service Customer de la nouvelle commande
        await rabbitMQClient.publishMessage('order_created', JSON.stringify({
            orderId: newOrder._id,
            customerId: newOrder.customerId,
            createdAt: newOrder.createdAt
        }));

        // Envoyer la réponse avec la commande complète
        return res.status(201).json(newOrder);

    } catch (error: any) {
        console.error('Erreur lors de la création de la commande:', error);
        if (error.message === 'Timeout en attendant la réponse des détails des produits') {
            return res.status(504).json({message: "Délai d'attente dépassé pour la récupération des détails des produits"});
        }
        return res.status(500).json({message: 'Erreur lors de la création de la commande', error: error.message});
    }
}
