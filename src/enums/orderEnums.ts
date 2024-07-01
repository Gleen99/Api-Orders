export enum OrderStatus {
    // Statut initial lorsqu'un client ajoute des produits à son panier
    IN_CART = 'in_cart',

    // La commande a été passée mais n'est pas encore traitée ou payée
    PENDING = 'pending',

    // Le paiement a été effectué et confirmé
    PAID = 'paid',

    // La commande a été expédiée au client
    SHIPPED = 'shipped',

    // La commande a été livrée au client
    DELIVERED = 'delivered',

    // La commande a été annulée (peut être à n'importe quel stade avant la livraison)
    CANCELLED = 'cancelled'
}
