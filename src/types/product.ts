import Joi from 'joi';

export const productSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'Product name must be at least 2 characters',
      'string.max': 'Product name must not exceed 50 characters'
    }),
  description: Joi.string()
    .min(10)
    .max(500)
    .required()
    .messages({
      'string.min': 'Description must be at least 10 characters',
      'string.max': 'Description must not exceed 500 characters'
    }),
  status: Joi.string().valid('active', 'inactive').required()
});

export const productIdSchema = Joi.object({
  id: Joi.string().pattern(/^P-\d+$/).messages({
    'string.pattern.base': 'Invalid product ID format'
  })
});

export interface ProductCreateInput {
  name: string;
  description: string;
  status: 'active' | 'inactive';
}

export type ProductUpdateInput = Partial<ProductCreateInput>;

export type ErrorResponse = {
  error: string;
}

