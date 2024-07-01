import { Request, Response } from 'express';
import Order from "../models/orders/OrdersModels";

export const getOrderProducts = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ message: 'Commande non trouvée' });
        }

        res.status(200).json(order.products);
    } catch (error) {
        console.error('Erreur lors de la récupération des produits de la commande:', error);
        res.status(500).json({ message: 'Erreur serveur', error: error instanceof Error ? error.message : String(error) });
    }
};
