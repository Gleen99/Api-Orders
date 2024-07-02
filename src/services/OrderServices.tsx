import Order, { IOrder, IProduct } from "../models/orders/OrdersModels";
import { Types } from "mongoose";
import { rabbitMQClient } from "../../rabbitmq";
import amqp from "amqplib";
import { OrderStatus } from "../enums/orderEnums";

// Fonction pour récupérer les détails des commandes
export async function fetchProductDetails(orderIds: string[]): Promise<IOrder[]> {
    try {
        const orders = await Order.find({ _id: { $in: orderIds } });
        return orders;
    } catch (error) {
        console.error('Erreur lors de la récupération des commandes depuis la base de données:', error);
        throw error;
    }
}

// Fonction pour obtenir les détails des produits
export async function getProductDetails(productIds: string[]): Promise<IProduct[]> {
    const correlationId = new Types.ObjectId().toString();
    console.log(`Demande de détails pour les produits: ${productIds.join(', ')}`);
    console.log(`CorrelationId généré: ${correlationId}`);

    return new Promise<IProduct[]>((resolve, reject) => {
        let consumerTag: string | undefined;

        const timeout = setTimeout(() => {
            console.log('Timeout atteint pour la requête de détails des produits');
            cleanupConsumer();
            reject(new Error('Timeout en attendant la réponse des détails des produits'));
        }, 30000);

        const cleanupConsumer = () => {
            clearTimeout(timeout);
            if (consumerTag) {
                rabbitMQClient.cancelConsume(consumerTag)
                    .catch(err => console.error("Erreur lors de l'annulation de la consommation:", err));
            }
        };

        rabbitMQClient.consumeMessage('products_details_response', async (msg: amqp.ConsumeMessage | null) => {
            if (!msg) return;

            console.log('Message reçu de RabbitMQ:', msg.content.toString());
            console.log('CorrelationId reçu:', msg.properties.correlationId);

            if (msg.properties.correlationId === correlationId) {
                cleanupConsumer();
                try {
                    const productsDetails: IProduct[] = JSON.parse(msg.content.toString());
                    console.log('Détails des produits reçus:', productsDetails);
                    resolve(productsDetails);
                } catch (error) {
                    console.error('Erreur lors du parsing des détails des produits:', error);
                    reject(new Error('Erreur lors du parsing des détails des produits'));
                }
            } else {
                console.log('Message ignoré car correlationId ne correspond pas');
            }
        }).then(tag => {
            consumerTag = tag;
            console.log('Consommateur configuré avec succès, tag:', tag);
        }).catch(err => {
            console.error('Erreur lors de la configuration du consommateur:', err);
            reject(new Error('Erreur lors de la configuration du consommateur'));
        });

        rabbitMQClient.publishMessage('get_products_details', JSON.stringify({ productIds, correlationId }), { correlationId })
            .then(() => console.log('Message publié avec succès'))
            .catch(err => {
                console.error('Erreur lors de la publication du message:', err);
                cleanupConsumer();
                reject(new Error('Erreur lors de la publication du message'));
            });
    });
}

// Fonction pour ajouter des produits à une commande
export async function addProductsToOrder(order: IOrder, productIds: string[]): Promise<void> {
    console.log("Action : ajout de produits");
    try {
        const newProducts: IProduct[] = await getProductDetailsWithRetry(productIds);
        console.log("Nouveaux produits récupérés :", newProducts);
        order.products.push(...newProducts.map(product => ({
            ...product,
            orderId: order._id
        })));
    } catch (error) {
        console.error("Erreur lors de la récupération des détails des produits:", error);
        throw new Error('Erreur lors de la récupération des détails des produits');
    }
}

// Fonction pour supprimer des produits d'une commande
export function removeProductsFromOrder(order: IOrder, productIds: string[]): void {
    console.log("Action : suppression de produits");
    const initialLength = order.products.length;
    order.products = order.products.filter(product => !productIds.includes(product._id.toString()));
    console.log(`Produits supprimés: ${initialLength - order.products.length}`);
}

// Fonction pour mettre à jour le statut d'une commande
export function updateOrderStatus(order: IOrder, newStatus: string): void {
    const normalizedStatus = newStatus.toLowerCase();
    if (Object.values(OrderStatus).includes(normalizedStatus as OrderStatus)) {
        console.log(`Mise à jour du statut : ${order.status} -> ${normalizedStatus}`);
        order.status = normalizedStatus as OrderStatus;
    } else {
        console.log(`Statuts valides : ${Object.values(OrderStatus).join(', ')}`);
        throw new Error(`Statut invalide : ${newStatus}`);
    }
}

// Fonction pour obtenir les détails des produits avec une tentative de réessai
export async function getProductDetailsWithRetry(productIds: string[], maxRetries = 3): Promise<IProduct[]> {
    for (let i = 0; i < maxRetries; i++) {
        try {
            console.log(`Tentative ${i + 1} de récupération des détails des produits`);
            return await getProductDetails(productIds);
        } catch (error) {
            console.error(`Tentative ${i + 1} échouée:`, error);
            if (i === maxRetries - 1) throw error;
            const delay = Math.pow(2, i) * 1000; // Backoff exponentiel: 1s, 2s, 4s
            console.log(`Attente de ${delay}ms avant la prochaine tentative`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw new Error('Nombre maximum de tentatives atteint');
}

// Consommateur RabbitMQ pour les commandes clients
export const initGetCustomerOrdersConsumer = () => {
    rabbitMQClient.consumeMessage('get_customer_produits', async (msg) => {
        if (!msg) return;
        try {
            const content = JSON.parse(msg.content.toString());
            const { customerId, correlationId, responseQueue } = content;

            console.log(`Récupération des commandes pour le client: ${customerId}`);
            const orders = await Order.find({ customerId }).populate('products');

            console.log('Envoi de la réponse avec les détails des commandes');
            const ordersJson = JSON.stringify(orders);

            await rabbitMQClient.publishMessage(
                responseQueue, // Utilisation de la queue de réponse fournie
                ordersJson,
                { correlationId }
            );
            console.log(`Réponse envoyée sur la queue: ${responseQueue}`);

            await rabbitMQClient.ackMessage(msg);
        } catch (error) {
            console.error('Erreur lors de la récupération des commandes:', error);
            const errorMessage = JSON.stringify({ error: 'Erreur lors de la récupération des commandes' });
            await rabbitMQClient.ackMessage(msg);
        }
    });
};

// Consommateur RabbitMQ pour les produits clients
export async function initGetCustomerProductsConsumer(msg: amqp.ConsumeMessage | null) {
    if (!msg) return;
    const content = JSON.parse(msg.content.toString());
    const { customerId, correlationId } = content;
    try {
        console.log(`Récupération des commandes pour le client: ${customerId}`);
        const orders = await Order.find({ customerId }).populate('products');
        console.log('Envoi de la réponse avec les détails des orders');
        await rabbitMQClient.publishMessage(
            'products_details_response',
            JSON.stringify(orders),
            { correlationId }
        );
    } catch (error) {
        console.error('Erreur lors de la récupération des commandes:', error);
    }
};

// Initialisation du service des commandes
export async function setupOrderService() {
    try {
        await rabbitMQClient.connect();
        await rabbitMQClient.setup();
        initGetCustomerOrdersConsumer();
        console.log('Configuration du consommateur pour get_customer_orders');
        await rabbitMQClient.consumeMessage('get_customer_orders', initGetCustomerProductsConsumer);
        console.log('Configuration du consommateur pour get_customer_products');
        console.log('Service des commandes configuré avec succès');
    } catch (error) {
        console.error('Erreur lors de la configuration du service des commandes:', error);
        throw error;
    }
}
