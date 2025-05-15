import * as Joi from "joi";

export const signupValidation = Joi.object({
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string()
    .min(8)
    .pattern(new RegExp("[a-zA-Z0-9!@#$%^&*]{8,}"))
    .required(),
});

export const loginValidation = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const googleValidation = Joi.object({
  email: Joi.string().email().required(),
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
});
