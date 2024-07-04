import mongoose from 'mongoose';
import swaggerUI from 'swagger-ui-express';
import swaggerSpec from './swagger';
import { rabbitMQClient } from './rabbitmq';
import express, { Express, Request, Response, NextFunction } from 'express';
import ordersRoutes from "./src/routes/OrdersRoutes";
import { setupOrderService } from "./src/services/OrderServices";
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
const API_BASE_PATH = '/api/v1';

// Fonction de validation de la clé API
const isValidApiKey = (apiKey: string): boolean => {
    const validApiKeys = ['key1', 'key2', 'key3']; // Exemple simplifié
    return validApiKeys.includes(apiKey);
};

// Middleware de validation de la clé API
const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.header('X-API-Key');
    if (!apiKey || !isValidApiKey(apiKey)) {
        logger.warn(`Tentative d'accès non autorisé avec la clé API: ${apiKey}`);
        return res.status(401).json({ error: 'Invalid API key' });
    }
    next();
};

// Routes protégées par la clé API
app.use(`${API_BASE_PATH}/orders`, validateApiKey, ordersRoutes);

// Route pour la documentation Swagger
app.use(`${API_BASE_PATH}/docs`, swaggerUI.serve, swaggerUI.setup(swaggerSpec));

// Gestion des erreurs sécurisée
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error(`${err.name}: ${err.message}\n${err.stack}`);
    res.status(500).json({
        message: 'Une erreur est survenue',
        error: process.env.NODE_ENV === 'production' ? {} : err.message
    });
});

// Connection MongoDB
const connectToMongoDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/orders');
        logger.info('Connecté à MongoDB');
    } catch (error) {
        logger.error('Erreur de connexion à MongoDB:', error);
        throw error;
    }
};

// Connection RabbitMQ
const setupRabbitMQ = async () => {
    try {
        await rabbitMQClient.connect();
        await rabbitMQClient.setup();
        logger.info('Connecté à RabbitMQ');
    } catch (error) {
        logger.error('Erreur de connexion à RabbitMQ:', error);
        throw error;
    }
};

const startServer = async (port: number) => {
    try {
        await connectToMongoDB();
        await setupRabbitMQ();
        await setupOrderService();
        logger.info('Consommateur de commandes clients initialisé');

        app.listen(port, () => {
            logger.info(`Serveur démarré sur le port ${port}`);
        }).on('error', (err: NodeJS.ErrnoException) => {
            if (err.code === 'EADDRINUSE') {
                logger.error(`Le port ${port} est déjà utilisé.`);
                process.exit(1);
            } else {
                logger.error('Erreur lors du démarrage du serveur:', err);
                process.exit(1);
            }
        });
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

const PORT = parseInt(process.env.PORT || '18301');

// Démarrage du serveur
startServer(PORT);

// Gestion de l'arrêt propre du serveur
process.on('SIGINT', async () => {
    logger.info('Arrêt du serveur...');
    await mongoose.disconnect();
    await rabbitMQClient.closeConnection();
    process.exit(0);
});
