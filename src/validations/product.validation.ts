import Joi from "joi";

export const productSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(50)
    .required(),
  description: Joi.string()
    .min(10)
    .max(500)
    .required(),
  status: Joi.string().valid('active', 'inactive')
}
);

export const updateProductSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(50)
    .optional(),
  description: Joi.string()
    .min(10)
    .max(500)
    .optional(),
  status: Joi.string().valid('active', 'inactive')
});

export const productValidation = productSchema;
export const updateProductValidation = updateProductSchema;
