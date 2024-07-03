import express from 'express';
import { getOrders } from '../controllers/getOrders';
import { getOrder } from '../controllers/getOrder';
import { createOrder } from '../controllers/createOrder';
import { updateOrder } from '../controllers/updateOrder';
import { deleteOrder } from '../controllers/deleteOrder';
import { getOrderProducts } from '../controllers/getOrderProducts';
import { getOrderProduct } from '../controllers/getOrderProduct';

const router = express.Router();

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     Order:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         customerId:
 *           type: string
 *         products:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Product'
 *         status:
 *           type: string
 *           enum: [in_cart, pending, paid, shipped, delivered, cancelled]
 *         createdAt:
 *           type: string
 *           format: date-time
 *     Product:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         price:
 *           type: number
 *         category:
 *           type: string
 *         stock:
 *           type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *         orderId:
 *           type: string
 *       required:
 *         - name
 *         - description
 *         - price
 *         - category
 *     OrderUpdate:
 *       type: object
 *       properties:
 *         action:
 *           type: string
 *           enum: [add, remove, updateStatus]
 *         productIds:
 *           type: array
 *           items:
 *             type: string
 *         status:
 *           type: string
 *           enum: [in_cart, pending, paid, shipped, delivered, cancelled]
 */

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: Récupérer toutes les commandes
 *     tags: [Commandes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des commandes récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Order'
 */
router.get('/', getOrders);

/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     summary: Récupérer une commande spécifique
 *     tags: [Commandes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Commande récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       404:
 *         description: Commande non trouvée
 */
router.get('/:id', getOrder);

/**
 * @swagger
 * /orders/{customerId}/{productIds}:
 *   post:
 *     summary: Créer une nouvelle commande
 *     tags: [Commandes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: productIds
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Commande créée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 */
router.post('/:customerId/:productIds', createOrder);

/**
 * @swagger
 * /orders/{orderId}:
 *   put:
 *     summary: Mettre à jour une commande
 *     tags: [Commandes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OrderUpdate'
 *     responses:
 *       200:
 *         description: Commande mise à jour avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       404:
 *         description: Commande non trouvée
 */
router.put('/:orderId', updateOrder);

/**
 * @swagger
 * /orders/{orderId}:
 *   delete:
 *     summary: Supprimer une commande
 *     tags: [Commandes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Commande supprimée avec succès
 *       404:
 *         description: Commande non trouvée
 */
router.delete('/:orderId', deleteOrder);

/**
 * @swagger
 * /orders/{id}/products:
 *   get:
 *     summary: Récupérer tous les produits d'une commande
 *     tags: [Produits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Produits de la commande récupérés avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *       404:
 *         description: Commande non trouvée
 */
router.get('/:id/products', getOrderProducts);

/**
 * @swagger
 * /orders/{id}/products/{productId}:
 *   get:
 *     summary: Récupérer un produit spécifique d'une commande
 *     tags: [Produits]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Produit de la commande récupéré avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Commande ou produit non trouvé
 */
router.get('/:id/products/:productId', getOrderProduct);

export default router;
