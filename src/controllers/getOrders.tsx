import { Request, Response } from 'express';
import {rabbitMQClient} from "../../rabbitmq";
import Order from "../models/orders/OrdersModels";

export const getOrders = async (req: Request, res: Response): Promise<void> => {
    try {
        const orders = await Order.find();

        if (orders.length === 0) {
            res.status(404).json({ message: 'Aucun Client trouvé' });
            return;
        }

        // Publier un message dans RabbitMQ pour enregistrer l'accès à la liste des clients
        await rabbitMQClient.publishMessage('liste_order_consultee', JSON.stringify({
            timestamp: new Date(),
            userIp: req.ip,
            count: orders.length
        }));

        res.status(200).json(orders);
    } catch (err) {
        console.error('Error in getOrders:', err);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};
