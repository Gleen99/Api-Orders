import Order, { IOrder, IProduct } from "../models/orders/OrdersModels";
import { Types } from "mongoose";
import { rabbitMQClient } from "../../rabbitmq";
import amqp from "amqplib";
import { OrderStatus } from "../enums/orderEnums";

export async function getProductDetails(productIds: string[]): Promise<IProduct[]> {
    const correlationId = new Types.ObjectId().toString();
    console.log(`Demande de détails pour les produits: ${productIds.join(', ')}`);
    console.log(`CorrelationId généré: ${correlationId}`);

    return new Promise((resolve, reject) => {
        let consumerTag: string;

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

        console.log('Configuration du consommateur...');
        rabbitMQClient.consumeMessage('products_details_response', async (msg: amqp.ConsumeMessage | null) => {
            if (!msg) return;

            console.log('Message reçu de RabbitMQ:', msg.content.toString());
            console.log('CorrelationId reçu:', msg.properties.correlationId);

            if (msg.properties.correlationId === correlationId) {
                cleanupConsumer();
                try {
                    const productsDetails = JSON.parse(msg.content.toString());
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

        console.log('Publication du message pour obtenir les détails des produits');
        rabbitMQClient.publishMessage('get_products_details', JSON.stringify({ productIds, correlationId }), { correlationId })
            .then(() => console.log('Message publié avec succès'))
            .catch(err => {
                console.error('Erreur lors de la publication du message:', err);
                cleanupConsumer();
                reject(new Error('Erreur lors de la publication du message'));
            });
    });
}

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

export function removeProductsFromOrder(order: IOrder, productIds: string[]): void {
    console.log("Action : suppression de produits");
    const initialLength = order.products.length;
    order.products = order.products.filter(product => !productIds.includes(product._id.toString()));
    console.log(`Produits supprimés: ${initialLength - order.products.length}`);
}

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

export const initGetCustomerOrdersConsumer = () => {
    rabbitMQClient.consumeMessage('get_customer_orders', async (msg) => {
        if (!msg) return;

        try {
            const content = JSON.parse(msg.content.toString());
            const { customerId, correlationId } = content;

            // Récupérer les commandes avec les détails des produits
            const orders = await Order.find({ customerId }).populate('products');

            // Publier la réponse avec les détails complets
            await rabbitMQClient.publishMessage(`get_customer_orders_response_${correlationId}`, JSON.stringify(orders));
            await rabbitMQClient.ackMessage(msg);
        } catch (error) {
            console.error('Erreur lors de la récupération des commandes:', error);
            if (msg.properties.correlationId) {
                await rabbitMQClient.publishMessage(`get_customer_orders_response_${msg.properties.correlationId}`, JSON.stringify({ error: 'Erreur lors de la récupération des commandes' }));
            }
            // Rejeter le message en cas d'erreur pour le retraiter plus tard
            await rabbitMQClient.nackMessage(msg, false, true);
        }
    });
};
