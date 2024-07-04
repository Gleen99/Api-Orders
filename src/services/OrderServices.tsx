import Order, { IOrder, IProduct } from "../models/orders/OrdersModels";
import { Types } from "mongoose";
import { rabbitMQClient } from "../../rabbitmq";
import amqp from "amqplib";
import { OrderStatus } from "../enums/orderEnums";

// Fonction pour récupérer les détails des orders
export async function fetchProductDetails(orderIds: string[]): Promise<IOrder[]> {
    try {
        const orders = await Order.find({ _id: { $in: orderIds } });

        return orders;
    } catch (error) {
        console.error('Erreur lors de la récupération des orders depuis la base de données:', error);
        throw error;
    }
}

// Fonction pour obtenir les détails des produits
export async function getProductDetails(productIds: string[]): Promise<IProduct[]> {
    const correlationId = new Types.ObjectId().toString();
    const responseQueue = `products_details_response_${correlationId}`;

    console.log(`Demande de détails pour les produits: ${productIds.join(', ')}`);

    return new Promise<IProduct[]>((resolve, reject) => {
        let consumerTag: string;

        const cleanup = () => {
            clearTimeout(timeoutId);
            if (consumerTag) {
                rabbitMQClient.cancelConsume(consumerTag).catch(console.error);
            }
        };

        const timeoutId = setTimeout(() => {
            cleanup();
            reject(new Error('Timeout en attendant la réponse des détails des produits'));
        }, 5000);

        rabbitMQClient.consumeMessage(responseQueue, async (msg: amqp.ConsumeMessage | null) => {
            if (!msg) return;

            try {
                const content = JSON.parse(msg.content.toString());
                if (content.error) {
                    throw new Error(content.error);
                }
                const productsDetails: IProduct[] = content;
                cleanup();
                resolve(productsDetails);
            } catch (error) {
                cleanup();
                if (error instanceof Error) {
                    reject(new Error(`Erreur lors du traitement de la réponse: ${error.message}`));
                } else {
                    reject(new Error('Erreur inconnue lors du traitement de la réponse'));
                }
            } finally {
                rabbitMQClient.ackMessage(msg).catch(console.error);
            }
        }).then(tag => {
            consumerTag = tag;
        }).catch(error => {
            cleanup();
            if (error instanceof Error) {
                reject(new Error(`Erreur lors de la configuration du consommateur: ${error.message}`));
            } else {
                reject(new Error('Erreur inconnue lors de la configuration du consommateur'));
            }
        });

        rabbitMQClient.publishMessage('get_products_details',
            JSON.stringify({ productIds, responseQueue }),
            { correlationId }
        ).catch(error => {
            cleanup();
            if (error instanceof Error) {
                reject(new Error(`Erreur lors de la publication du message: ${error.message}`));
            } else {
                reject(new Error('Erreur inconnue lors de la publication du message'));
            }
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
            const startTime = Date.now();
            const products = await getProductDetails(productIds);
            const endTime = Date.now();
            console.log(`Temps de réponse: ${endTime - startTime}ms`);

            if (products.length > 0) {
                console.log(`Détails des produits récupérés avec succès à la tentative ${i + 1}`);
                return products;
            }
            console.log(`Tentative ${i + 1}: Aucun produit trouvé, nouvelle tentative...`);
        } catch (error) {
            console.error(`Tentative ${i + 1} échouée:`, error);
        }

        if (i < maxRetries - 1) {
            const delay = Math.min(1000 * Math.pow(2, i), 5000); // Max delay of 10 seconds
            console.log(`Attente de ${delay}ms avant la prochaine tentative`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw new Error('Aucun produit trouvé avec les IDs fournis après plusieurs tentatives');
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