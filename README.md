# API de Gestion des Commandes

## Description
Cette API gère les commandes pour un système de e-commerce. Elle permet de créer, lire, mettre à jour et supprimer des commandes, ainsi que de gérer les produits associés à ces commandes.

## Technologies Utilisées
- Node.js
- Express.js
- TypeScript
- MongoDB avec Mongoose
- RabbitMQ pour la messagerie
- Joi pour la validation des données
- Swagger pour la documentation de l'API

## Installation

1. Clonez le dépôt :
   ```
   git clone [URL_DU_REPO]
   ```

2. Installez les dépendances :
   ```
   npm install
   ```

3. Configurez les variables d'environnement dans un fichier `.env` :
   ```
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/orders
   RABBITMQ_URL=amqp://localhost
   ```

4. Démarrez le serveur :
   ```
   npm start
   ```

## Structure du Projet

```
.
├── src/
│   ├── controllers/
│   │   ├── createOrder.ts
│   │   ├── updateOrder.ts
│   │   └── ...
│   ├── models/
│   │   └── orders/
│   │       └── OrdersModels.ts
│   ├── routes/
│   │   └── OrdersRoutes.ts
│   ├── services/
│   │   └── productUtils.ts
│   ├── validator/
│   │   └── validationOrders.ts
│   ├── enums/
│   │   └── orderEnums.ts
│   └── app.ts
├── tests/
│   └── ...
├── swagger.ts
├── package.json
└── tsconfig.json
```

## Routes API

### 1. Créer une Commande
- **Méthode** : POST
- **Chemin** : `/api/orders/:customerId/:productIds`
- **Description** : Crée une nouvelle commande pour un client avec les produits spécifiés.
- **Paramètres URL** :
  - `customerId` : ID du client
  - `productIds` : IDs des produits séparés par des virgules
- **Réponse** : Objet de la commande créée

### 2. Obtenir une Commande
- **Méthode** : GET
- **Chemin** : `/api/orders/:id`
- **Description** : Récupère les détails d'une commande spécifique.
- **Paramètres URL** :
  - `id` : ID de la commande
- **Réponse** : Objet de la commande

### 3. Mettre à Jour une Commande
- **Méthode** : PUT
- **Chemin** : `/api/orders/:orderId`
- **Description** : Met à jour une commande existante.
- **Paramètres URL** :
  - `orderId` : ID de la commande
- **Corps de la Requête** :
  ```json
  {
    "action": "add" | "remove" | "updateStatus",
    "productIds": ["id1", "id2"],
    "status": "pending" | "paid" | "shipped" | "delivered"
  }
  ```
- **Réponse** : Objet de la commande mise à jour

### 4. Supprimer une Commande
- **Méthode** : DELETE
- **Chemin** : `/api/orders/:orderId`
- **Description** : Supprime une commande spécifique.
- **Paramètres URL** :
  - `orderId` : ID de la commande
- **Réponse** : Message de confirmation

### 5. Obtenir les Produits d'une Commande
- **Méthode** : GET
- **Chemin** : `/api/orders/:id/products`
- **Description** : Récupère tous les produits d'une commande spécifique.
- **Paramètres URL** :
  - `id` : ID de la commande
- **Réponse** : Liste des produits de la commande

### 6. Obtenir un Produit Spécifique d'une Commande
- **Méthode** : GET
- **Chemin** : `/api/orders/:id/products/:productId`
- **Description** : Récupère un produit spécifique d'une commande.
- **Paramètres URL** :
  - `id` : ID de la commande
  - `productId` : ID du produit
- **Réponse** : Objet du produit

## Tests

Pour exécuter les tests :

A compléter

## Documentation Swagger

La documentation Swagger de l'API est disponible à l'adresse :
```
http://localhost:3000/v1/docs
```

## Gestion des Erreurs

L'API utilise des codes d'état HTTP standard pour indiquer le succès ou l'échec d'une requête API. Les erreurs sont renvoyées au format JSON avec un message descriptif.

