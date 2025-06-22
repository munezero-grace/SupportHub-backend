import Joi from "joi";

export const ticketSchema = Joi.object({
  ticketCode: Joi.string().required(),
  title: Joi.string().min(2).max(100).required(),
  description: Joi.string().min(2).max(1000).required(),
  product: Joi.string().required(),
  status: Joi.string()
    .valid("in_progress", "new", "assigned", "awaiting_client", "resolved")
    .default("in_progress"),
  priority: Joi.string()
    .valid("medium", "low", "high", "critical")
    .default("medium"),
  client: Joi.string().optional(),
  contactName: Joi.string().allow("").optional(),
  contactEmail: Joi.string().email().optional(),
  contactPhone: Joi.string().allow("").optional(),
  imageUrl: Joi.string().uri().optional(),
});

export const updateTicketSchema = Joi.object({
  ticketCode: Joi.string().optional(),
  title: Joi.string().min(2).max(100).optional(),
  description: Joi.string().min(2).max(1000).optional(),
  product: Joi.string().optional(),
  status: Joi.string()
    .valid("in_progress", "new", "assigned", "awaiting_client", "resolved")
    .optional(),
  priority: Joi.string().valid("medium", "low", "high", "critical").optional(),
  client: Joi.string().optional(),
  contactName: Joi.string().optional(),
  contactEmail: Joi.string().email().optional(),
  contactPhone: Joi.string().optional(),
  imageUrl: Joi.string().uri().optional(),
});
