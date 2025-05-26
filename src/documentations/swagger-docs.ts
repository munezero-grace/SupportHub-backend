import swaggerUi from "swagger-ui-express";
import { Express } from "express";
import j2s from "joi-to-swagger";
import { signupValidation, loginValidation, googleValidation } from "../validations/auth.validation";

const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "BP Ticket Internship Backend API",
    version: "1.0.0",
    description: "API documentation for BP Ticket Internship Backend",
  },
  paths: {
    "/api/auth/signup": {
      post: {
        summary: "User signup",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: j2s(signupValidation).swagger,
            },
          },
        },
        responses: {
          "201": {
            description: "User registered successfully",
          },
          "409": {
            description: "User already exists",
          },
        },
      },
    },
    "/api/auth/login": {
      post: {
        summary: "User login",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: j2s(loginValidation).swagger,
            },
          },
        },
        responses: {
          "200": {
            description: "Login successful",
          },
          "400": {
            description: "Invalid credentials",
          },
        },
      },
    },
    "/api/auth/google-signin": {
      post: {
        summary: "Google sign-in",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: j2s(googleValidation).swagger,
            },
          },
        },
        responses: {
          "200": {
            description: "Google sign-in successful",
          },
        },
      },
    },
  },
};

export function setupSwagger(app: Express) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}
