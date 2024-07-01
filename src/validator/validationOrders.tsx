import Joi from 'joi';
import { ObjectId } from 'mongodb';

// Validateur pour ObjectId
const objectIdValidator = (value: string, helpers: Joi.CustomHelpers) => {
    if (!ObjectId.isValid(value)) {
        return helpers.error('any.invalid');
    }
    return value;
};

// Schéma de validation pour la création d'une commande
export const createOrderSchema = Joi.object({
    customerId: Joi.string().custom(objectIdValidator, 'valid ObjectId').required(),
    productIds: Joi.string().pattern(/^[a-f\d]{24}(,[a-f\d]{24})*$/).required()
});

// Schéma de validation pour la mise à jour d'une commande
export const updateOrderSchema = Joi.object({
    orderId: Joi.string().custom(objectIdValidator, 'valid ObjectId').required(),
    action: Joi.string().valid('add', 'remove', 'updateStatus').required(),
    productIds: Joi.when('action', {
        is: Joi.string().valid('add', 'remove'),
        then: Joi.string().pattern(/^[a-f\d]{24}(,[a-f\d]{24})*$/).required(),
        otherwise: Joi.forbidden()
    }),
    status: Joi.when('action', {
        is: 'updateStatus',
        then: Joi.string().valid('PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED').required(),
        otherwise: Joi.forbidden()
    })
});

// Fonction de validation pour la création d'une commande
export const validateCreateOrderParams = (data: any) => {
    return createOrderSchema.validate(data, { abortEarly: false });
};

// Fonction de validation pour la mise à jour d'une commande
export const validateUpdateOrder = (data: any) => {
    return updateOrderSchema.validate(data, { abortEarly: false });
};
