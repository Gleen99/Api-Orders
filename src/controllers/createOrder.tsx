import { Request, Response } from 'express';
import Order, { IOrder, IProduct } from "../models/orders/OrdersModels";
import { getProductDetails } from "../services/productServices";
import { validateCreateOrderParams } from "../validator/validationOrders";
import { rabbitMQClient } from "../../rabbitmq"; // Assurez-vous que ce chemin est correct

export const createOrder = async (req: Request, res: Response) => {
    const { customerId, productIds } = req.params;

    // Validation des paramètres
    const { error } = validateCreateOrderParams(req.body);
    if (error) {
        return res.status(400).json({ message: error.details.map(d => d.message) });
    }

    // Séparer les productIds et filtrer les valeurs vides
    const productIdsArray = productIds.split(',').filter(id => id.trim() !== '');

    if (productIdsArray.length === 0) {
        return res.status(400).json({ message: 'Au moins un productId valide est requis' });
    }

    try {
        // Récupérer les détails des produits avant de créer la commande
        const productsDetails: IProduct[] = await getProductDetails(productIdsArray);

        if (productsDetails.length === 0) {
            return res.status(404).json({message: 'Aucun produit trouvé avec les IDs fournis'});
        }

        // Créer une nouvelle instance de commande sans l'enregistrer
        const newOrder: IOrder = new Order({
            customerId,
            products: [],  // Nous allons ajouter les produits après avoir obtenu l'_id
            createdAt: new Date()
        });

        // Ajouter l'orderId à chaque produit
        const productsWithOrderId: IProduct[] = productsDetails.map(product => ({
            ...product,
            orderId: newOrder._id
        }));

        // Assigner les produits avec orderId à la commande
        newOrder.products = productsWithOrderId;

        // Sauvegarder la commande
        await newOrder.save();

        // Envoyer la réponse avec la commande complète
        const completeOrder = {
            id: newOrder._id,
            customerId,
            products: newOrder.products,
            createdAt: newOrder.createdAt
        };

        // Publier un message pour informer le service Customer de la nouvelle commande
        await rabbitMQClient.publishMessage('order_created', JSON.stringify({
            orderId: newOrder._id,
            customerId: newOrder.customerId,
            createdAt: newOrder.createdAt
        }));

        res.status(201).json(completeOrder);

    } catch (error: any) {
        console.error('Erreur lors de la création de la commande:', error);
        if (error.message === 'Timeout en attendant la réponse des détails des produits') {
            return res.status(504).json({message: "Délai d'attente dépassé pour la récupération des détails des produits"});
        }
        res.status(500).json({message: 'Erreur lors de la création de la commande', error: error.message});
    }
}
