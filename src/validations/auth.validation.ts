import Joi from "joi";

const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[a-zA-Z\d!@#$%^&*]{8,}$/;

export const signupSchema = Joi.object({
  firstName: Joi.string()
    .min(1)
    .required()
    .messages({ "string.empty": "firstName is not allowed to be empty" }),

  lastName: Joi.string()
    .min(1)
    .required()
    .messages({ "string.empty": "lastName is not allowed to be empty" }),

  email: Joi.string().email().pattern(gmailRegex).required().messages({
    "string.email": "email must be a valid email",
    "string.pattern.base": "email must be a valid Gmail address (@gmail.com)",
    "string.empty": "email is required",
  }),

  password: Joi.string().min(8).pattern(passwordRegex).required().messages({
    "string.min": "password must be at least 8 characters long",
    "string.pattern.base":
      "password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (!@#$%^&*)",
    "string.empty": "password is required",
  }),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "email must be a valid email",
    "string.empty": "email is required",
  }),

  password: Joi.string()
    .min(1)
    .required()
    .messages({ "string.empty": "password is not allowed to be empty" }),
});

export const googleSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "email must be a valid email",
    "string.empty": "email is required",
  }),

  firstName: Joi.string()
    .min(1)
    .required()
    .messages({ "string.empty": "firstName is required" }),

  lastName: Joi.string()
    .min(1)
    .required()
    .messages({ "string.empty": "lastName is required" }),

  provider: Joi.string().valid("google").required().messages({
    "any.only": "provider must be 'google'",
    "string.empty": "provider is required",
  }),

  providerId: Joi.string()
    .min(1)
    .required()
    .messages({ "string.empty": "providerId is required" }),
});

export const signupValidation = signupSchema;
export const loginValidation = loginSchema;
export const googleValidation = googleSchema;
