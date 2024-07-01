import { Request, Response } from 'express';
import Order from "../models/orders/OrdersModels";

export const getOrderProduct = async (req: Request, res: Response) => {
    const { id, productId } = req.params;

    try {
        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ message: 'Commande non trouvée' });
        }

        const product = order.products.find(p => p._id.toString() === productId);
        if (!product) {
            return res.status(404).json({ message: 'Produit non trouvé dans cette commande' });
        }

        res.status(200).json(product);
    } catch (error) {
        console.error('Erreur lors de la récupération du produit de la commande:', error);
        res.status(500).json({ message: 'Erreur serveur', error: error instanceof Error ? error.message : String(error) });
    }
};
