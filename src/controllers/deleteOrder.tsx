import { Request, Response } from 'express';
import Order from "../models/orders/OrdersModels";
import { OrderStatus } from "../enums/orderEnums";

export const deleteOrder = async (req: Request, res: Response) => {
    const { orderId } = req.params;
    console.log("Tentative de suppression de la commande :", orderId);

    if (!orderId || typeof orderId !== 'string') {
        console.log("Erreur : orderId invalide");
        return res.status(400).json({ message: 'Un orderId valide est requis' });
    }

    try {
        let order = await Order.findById(orderId);
        if (!order) {
            console.log("Erreur : commande non trouvée");
            return res.status(404).json({ message: 'Commande non trouvée' });
        }

        console.log("Commande trouvée :", order);

        // Vérifier si la commande peut être supprimée/annulée
        if (order.status === OrderStatus.SHIPPED || order.status === OrderStatus.DELIVERED) {
            console.log("Erreur : Impossible de supprimer une commande expédiée ou livrée");
            return res.status(400).json({ message: 'Impossible de supprimer une commande expédiée ou livrée' });
        }

        // Mettre à jour le statut de la commande à CANCELLED
        order.status = OrderStatus.CANCELLED;

        console.log("Sauvegarde de la commande annulée");
        await order.save();
        console.log("Commande annulée avec succès");

        res.status(200).json({ message: 'Commande annulée avec succès', order });
    } catch (error) {
        console.error('Erreur lors de la suppression de la commande:', error);
        res.status(500).json({ message: 'Erreur lors de la suppression de la commande', error: error instanceof Error ? error.message : String(error) });
    }
}
