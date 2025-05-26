import { z } from "zod";

const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[a-zA-Z\d!@#$%^&*]{8,}$/;

export const signupValidation = {
  body: z.object({
    firstName: z.string().min(1, "firstName is not allowed to be empty"),
    lastName: z.string().min(1, "lastName is not allowed to be empty"),
    email: z
      .string()
      .email("email must be a valid email")
      .regex(gmailRegex, "email must be a valid Gmail address (@gmail.com)"),
    password: z
      .string()
      .min(8, "password must be at least 8 characters long")
      .regex(
        passwordRegex,
        "password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (!@#$%^&*)"
      ),
  }),
};

export const loginValidation = {
  body: z.object({
    email: z
      .string()
      .email("email must be a valid email")
      .regex(gmailRegex, "email must be a valid Gmail address (@gmail.com)"),
    password: z.string().min(1, "password is not allowed to be empty"),
    provider: z.enum(["credentials"]),
  }),
};

export const googleValidation = {
  body: z.object({
    email: z
      .string()
      .email("email must be a valid email")
      .regex(gmailRegex, "email must be a valid Gmail address (@gmail.com)"),
    firstName: z.string().min(1, "firstName is required"),
    lastName: z.string().min(1, "lastName is required"),
    provider: z.enum(["google"]),
    providerId: z.string().min(1, "providerId is required"),
  }),
};
