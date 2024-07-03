import swaggerJSDoc from 'swagger-jsdoc';

const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'API de Gestion des Commandes et Produits',
        version: '1.0.0',
        description: 'API pour gérer les commandes et les produits associés',
    },
    servers: [
        {
            url: 'http://localhost:17301/api/v1',
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
    },
    securitySchemes: {
        ApiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key'
        }
    },
    security: [{
        ApiKeyAuth: []
    }]
};

const options: swaggerJSDoc.Options = {
    swaggerDefinition,
    apis: ['./src/routes/*.tsx']
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;
