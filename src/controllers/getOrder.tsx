import { Request, Response } from 'express';
import { isValidObjectId } from 'mongoose';
import Order from "../models/orders/OrdersModels";
import {rabbitMQClient} from "../../rabbitmq";

export const getOrder = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    if (!id || !isValidObjectId(id)) {
        res.status(400).json({ message: 'ID du order invalide' });
        return;
    }

    try {
        const order = await Order.findById(id);

        if (!order) {
            res.status(404).json({ message: 'Order non trouvé' });
            return;
        }

        // Publier un message dans RabbitMQ pour enregistrer l'accès
        await rabbitMQClient.publishMessage('order_consulte', JSON.stringify({
            id: order._id,
            timestamp: new Date(),
            userIp: req.ip
        }));

        res.status(200).json(order);
    } catch (err) {
        console.error('Error in getOrder:', err);
        res.status(500).json({ message: 'Erreur serveur' });
    }
};