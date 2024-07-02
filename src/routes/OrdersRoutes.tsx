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
 * /:
 *   get:
 *     summary: Récupérer toutes les commandes
 *     tags: [Commandes]
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
 * /{id}:
 *   get:
 *     summary: Récupérer une commande spécifique
 *     tags: [Commandes]
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
 * /{customerId}/{productIds}:
 *   post:
 *     summary: Créer une nouvelle commande
 *     tags: [Commandes]
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
 * /{orderId}:
 *   put:
 *     summary: Mettre à jour une commande
 *     tags: [Commandes]
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
 * /{orderId}:
 *   delete:
 *     summary: Supprimer une commande
 *     tags: [Commandes]
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
 * /{id}/products:
 *   get:
 *     summary: Récupérer tous les produits d'une commande
 *     tags: [Produits]
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
 * /{id}/products/{productId}:
 *   get:
 *     summary: Récupérer un produit spécifique d'une commande
 *     tags: [Produits]
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

/**
 * @swagger
 * components:
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
 *         details:
 *           type: object
 *           properties:
 *             price:
 *               type: string
 *             description:
 *               type: string
 *             color:
 *               type: string
 *         stock:
 *           type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *         orderId:
 *           type: string
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
 *           enum: [in_cart, pending, paid, shipped, delivered]
 */
