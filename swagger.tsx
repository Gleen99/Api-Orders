import swaggerJsdoc from 'swagger-jsdoc';

const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'API de Gestion des Commandes et Produits',
        version: '1.0.0',
        description: 'API pour gérer les commandes et les produits associés',
    },
    servers: [
        {
            url: 'http://v1/orders',
            description: 'Serveur de développement',
        }
    ],
    components: {
        schemas: {
            Order: {
                type: 'object',
                properties: {
                    _id: {
                        type: 'string'
                    },
                    customerId: {
                        type: 'string'
                    },
                    products: {
                        type: 'array',
                        items: {
                            $ref: '#/components/schemas/Product'
                        }
                    },
                    status: {
                        type: 'string',
                        enum: ['in_cart', 'pending', 'paid', 'shipped', 'delivered', 'cancelled']
                    },
                    createdAt: {
                        type: 'string',
                        format: 'date-time'
                    }
                }
            },
            Product: {
                type: 'object',
                properties: {
                    _id: {
                        type: 'string'
                    },
                    name: {
                        type: 'string'
                    },
                    description: {
                        type: 'string'
                    },
                    price: {
                        type: 'number'
                    },
                    category: {
                        type: 'string'
                    },
                    stock: {
                        type: 'integer'
                    },
                    createdAt: {
                        type: 'string',
                        format: 'date-time'
                    },
                    orderId: {
                        type: 'string'
                    }
                },
                required: ['name', 'description', 'price', 'category']
            }
        }
    }
};

const options: swaggerJsdoc.Options = {
    swaggerDefinition,
    apis: ['./src/routes/*.ts'] // Changé de .tsx à .ts
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
