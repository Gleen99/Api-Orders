import mongoose from 'mongoose';
import { rabbitMQClient } from './rabbitmq';
import express, { Express, Request, Response, NextFunction } from 'express';
import ordersRoutes from "./src/routes/OrdersRoutes";
import { initGetCustomerOrdersConsumer } from "./src/services/productServices";
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import winston from 'winston';
import dotenv from 'dotenv';

dotenv.config();

const app: Express = express();

// Configuration de Winston pour le logging
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
    ],
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple(),
    }));
}

// Middlewares de sécurité
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Définissez l'URL de base de votre API
const API_BASE_PATH = '/v1';

// Routes
app.use(`${API_BASE_PATH}/orders`, ordersRoutes);


// Gestion des erreurs sécurisée
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error(`${err.name}: ${err.message}\n${err.stack}`);
    res.status(500).json({
        message: 'Une erreur est survenue',
        error: process.env.NODE_ENV === 'production' ? {} : err.message
    });
});

// Fonction pour initialiser les connexions et les consommateurs
const initializeServices = async () => {
    try {
        // Connexion à MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/orders');
        logger.info('Connecté à MongoDB');

        // Connexion à RabbitMQ
        await rabbitMQClient.connect();
        logger.info('Connecté à RabbitMQ');

        // Initialiser le consommateur pour les requêtes de commandes clients
        await initGetCustomerOrdersConsumer();
        logger.info('Consommateur de commandes clients initialisé');

    } catch (error) {
        logger.error('Erreur lors de l\'initialisation des services:', error);
        throw error;
    }
};

// Fonction pour démarrer le serveur
const startServer = async () => {
    try {
        await initializeServices();

        const PORT = 18301;
        const server = app.listen(PORT, () => {
            logger.info(`Serveur démarré sur le port ${PORT}`);
        });

        // Gestion de l'arrêt propre
        const gracefulShutdown = async () => {
            logger.info('Arrêt du serveur...');
            server.close(async () => {
                try {
                    await mongoose.connection.close();
                    await rabbitMQClient.closeConnection();
                    logger.info('Connexions fermées proprement');
                    process.exit(0);
                } catch (error) {
                    logger.error('Erreur lors de la fermeture des connexions:', error);
                    process.exit(1);
                }
            });
        };

        process.on('SIGINT', gracefulShutdown);
        process.on('SIGTERM', gracefulShutdown);

    } catch (error) {
        logger.error('Erreur lors du démarrage du serveur:', error);
        process.exit(1);
    }
};

// Gestion des événements de connexion MongoDB
mongoose.connection.on('error', err => {
    logger.error('Erreur de connexion MongoDB:', err);
});

mongoose.connection.on('disconnected', () => {
    logger.info('Connexion à MongoDB interrompue');
});

// Démarrage du serveur
startServer();
