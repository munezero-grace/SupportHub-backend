
import Joi from "joi";
import { SupportTier, ClientStatus } from "@prisma/client";

export const createClientSchema = Joi.object({
  companyName: Joi.string().required().trim().min(2).messages({
    "string.empty": "Company name is not allowed to be empty",
    "string.min": "Company name must be at least 2 characters long",
    "any.required": "Company name is required",
  }),
  contactName: Joi.string().required().trim().min(2).messages({
    "string.empty": "Contact name is not allowed to be empty",
    "string.min": "Contact name must be at least 2 characters long",
    "any.required": "Contact name is required",
  }),
  contactEmail: Joi.string()
    .email()
    .required()
    .messages({
      "string.email": "Contact email must be a valid email address",
      "string.empty": "Contact email is not allowed to be empty",
      "any.required": "Contact email is required",
    }),
  supportTier: Joi.string()
    .valid(...Object.values(SupportTier))
    .default(SupportTier.standard)
    .messages({
      "any.only": "Support tier must be one of: standard, premium",
    }),
  status: Joi.string()
    .valid(...Object.values(ClientStatus))
    .default(ClientStatus.active)
    .messages({
      "any.only": "Status must be one of: active, inactive",
    }),
  userId: Joi.string().optional(),
});

export const updateClientSchema = Joi.object({
  companyName: Joi.string()
    .trim()
    .min(2)
    .messages({
      "string.empty": "Company name is not allowed to be empty",
      "string.min": "Company name must be at least 2 characters long",
    }),
  contactName: Joi.string()
    .trim()
    .min(2)
    .messages({
      "string.empty": "Contact name is not allowed to be empty",
      "string.min": "Contact name must be at least 2 characters long",
    }),

  contactEmail: Joi.string()
    .email()
    .messages({
      "string.email": "Contact email must be a valid email address",
      "string.empty": "Contact email is not allowed to be empty",
    }),
  supportTier: Joi.string()
    .valid(...Object.values(SupportTier))
    .messages({
      "any.only": "Support tier must be one of: standard, premium",
    }),
  status: Joi.string()
    .valid(...Object.values(ClientStatus))
    .messages({
      "any.only": "Status must be one of: active, inactive",
    }),
  userId: Joi.string(),
});
