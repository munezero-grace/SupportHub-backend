import * as Joi from "joi";

export const signupValidation = Joi.object({
  firstName: Joi.string().required().messages({
    "string.empty": "firstName is not allowed to be empty",
    "any.required": "firstName is required",
  }),
  lastName: Joi.string().required().messages({
    "string.empty": "lastName is not allowed to be empty",
    "any.required": "lastName is required",
  }),
  email: Joi.string()
    .email()
    .pattern(/^[a-zA-Z0-9._%+-]+@gmail\.com$/)
    .required()
    .messages({
      "string.email": "email must be a valid email",
      "string.empty": "email is not allowed to be empty",
      "string.pattern.base": "email must be a valid Gmail address (@gmail.com)",
      "any.required": "email is required",
    }),
  password: Joi.string()
    .min(8)
    .pattern(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[a-zA-Z\d!@#$%^&*]{8,}$/
    )
    .required()
    .messages({
      "string.pattern.base":
        "password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (!@#$%^&*)",
      "string.min": "password must be at least 8 characters long",
      "string.empty": "password is not allowed to be empty",
      "any.required": "password is required",
    }),
});

export const loginValidation = Joi.object({
  email: Joi.string()
    .email()
    .pattern(/^[a-zA-Z0-9._%+-]+@gmail\.com$/)
    .required()
    .messages({
      "string.email": "email must be a valid email",
      "string.empty": "email is not allowed to be empty",
      "string.pattern.base": "email must be a valid Gmail address (@gmail.com)",
      "any.required": "email is required",
    }),
  password: Joi.string().required(),
});

export const googleValidation = Joi.object({
  email: Joi.string().email().required(),
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  provider: Joi.string().valid("google").required(),
  providerId: Joi.string().required(),
});
