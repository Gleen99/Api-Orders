import Order, { IOrder, IProduct } from "../models/orders/OrdersModels";
import { Types } from "mongoose";
import { rabbitMQClient } from "../../rabbitmq";
import amqp from "amqplib";
import { OrderStatus } from "../enums/orderEnums";

// Fonction pour obtenir les détails des produits
export async function getProductDetails(productIds: string[]): Promise<IProduct[]> {
    const correlationId = new Types.ObjectId().toString();
    const responseQueue = `products_details_response_${correlationId}`;

    console.log(`Demande de détails pour les produits: ${productIds.join(', ')}`);
    console.log(`CorrelationId généré: ${correlationId}`);

    return new Promise<IProduct[]>((resolve, reject) => {
        const timeout = setTimeout(() => {
            console.log('Timeout atteint pour la requête de détails des produits');
            rabbitMQClient.removeListener(responseQueue);
            reject(new Error('Timeout en attendant la réponse des détails des produits'));
        }, 30000);

        rabbitMQClient.consumeMessage(responseQueue, async (msg: amqp.ConsumeMessage | null) => {
            if (!msg) return;

            clearTimeout(timeout);
            rabbitMQClient.removeListener(responseQueue);

            try {
                const productsDetails: IProduct[] = JSON.parse(msg.content.toString());
                console.log('Détails des produits reçus:', productsDetails);
                resolve(productsDetails);
            } catch (error) {
                console.error('Erreur lors du parsing des détails des produits:', error);
                reject(new Error('Erreur lors du parsing des détails des produits'));
            }
        });

        rabbitMQClient.publishMessage('get_products_details', JSON.stringify({ productIds, correlationId, responseQueue }))
            .catch(err => {
                console.error('Erreur lors de la publication du message:', err);
                clearTimeout(timeout);
                rabbitMQClient.removeListener(responseQueue);
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

// Initialisation du consommateur pour getCustomerOrders
export const initGetOrderDetailsConsumer = () => {
    rabbitMQClient.consumeMessage('get_order_details', async (msg) => {
        if (!msg) return;
        try {
            const content = JSON.parse(msg.content.toString());
            const { customerId, orderId, productId, correlationId, responseQueue } = content;

            interface OrderQuery {
                customerId: string;
                _id?: Types.ObjectId;
            }

            let query: OrderQuery = { customerId };
            if (orderId) {
                query._id = new Types.ObjectId(orderId);
            }

            const orders = await Order.find(query).populate('products');

            let response;
            if (productId) {
                response = orders.map(order => ({
                    ...order.toObject(),
                    products: order.products.filter(product => product._id.toString() === productId)
                }));
            } else {
                response = orders;
            }

            await rabbitMQClient.publishMessage(responseQueue, JSON.stringify(response), { correlationId });
            await rabbitMQClient.ackMessage(msg);
        } catch (error) {
            console.error('Erreur lors de la récupération des détails de la commande:', error);
            await rabbitMQClient.nackMessage(msg, false, true);
        }
    });
};

// Fonction pour configurer le service des orders
export async function setupOrderService() {
    try {
        await rabbitMQClient.connect();
        await rabbitMQClient.setup();
        console.log('Configuration du consommateur pour get_customer_orders');
        initGetOrderDetailsConsumer();
        console.log('Service des orders configuré avec succès');
    } catch (error) {
        console.error('Erreur lors de la configuration du service des orders:', error);
        throw error;
    }
}