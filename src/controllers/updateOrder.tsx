import { Request, Response } from 'express';
import Order, { IOrder, IProduct } from "../models/orders/OrdersModels";
import { OrderStatus } from "../enums/orderEnums";
import { addProductsToOrder, removeProductsFromOrder, updateOrderStatus } from "../services/OrderServices";
import {validateUpdateOrder} from "../validator/validationOrders";

export const updateOrder = async (req: Request, res: Response) => {
    const { error } = validateUpdateOrder(req.body);
    if (error) {
        return res.status(400).json({ message: error.details.map(d => d.message) });
    }

    const { orderId } = req.params;
    const { productIds, action, status } = req.body;
    console.log("Mise à jour de la commande :", { orderId, action, productIds, status });

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

        // Gestion spéciale pour les commandes annulées
        if (order.status === OrderStatus.CANCELLED) {
            if (action === 'updateStatus' && status && status.toLowerCase() === OrderStatus.PENDING.toLowerCase()) {
                console.log("Réactivation d'une commande annulée");
                order.status = OrderStatus.PENDING;
            } else {
                console.log("Erreur : Impossible de modifier une commande annulée sauf pour la réactiver");
                return res.status(400).json({ message: 'Impossible de modifier une commande annulée sauf pour la réactiver' });
            }
        } else {
            // Logique existante pour les commandes non annulées
            if (action === 'add' && productIds && Array.isArray(productIds)) {
                await addProductsToOrder(order, productIds);
            } else if (action === 'remove' && productIds && Array.isArray(productIds)) {
                removeProductsFromOrder(order, productIds);
            } else if (action === 'updateStatus' && status) {
                if (status.toLowerCase() === OrderStatus.CANCELLED.toLowerCase()) {
                    console.log("Erreur : Impossible de passer une commande au statut CANCELLED via cette méthode");
                    return res.status(400).json({ message: 'Impossible de passer une commande au statut CANCELLED via cette méthode' });
                }
                console.log(`Tentative de mise à jour du statut vers : ${status}`);
                updateOrderStatus(order, status);
            } else {
                console.log("Erreur : action invalide ou paramètres manquants");
                return res.status(400).json({ message: 'Action invalide ou paramètres manquants' });
            }
        }

        console.log("Sauvegarde de la commande mise à jour");
        await order.save();
        console.log("Commande mise à jour avec succès");

        res.status(200).json(order);
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la commande:', error);
        res.status(500).json({ message: 'Erreur lors de la mise à jour de la commande', error: error instanceof Error ? error.message : String(error) });
    }
}
