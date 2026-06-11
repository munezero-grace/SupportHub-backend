import swaggerUi from "swagger-ui-express";
import { Express } from "express";
import j2s from "joi-to-swagger";
import Joi from "joi";
import {
  signupValidation,
  loginValidation,
  googleValidation,
} from "../validations/auth.validation";

const slackSettingsValidation = Joi.object({
  slackWebhookUrl: Joi.string()
    .uri()
    .allow("")
    .description("Slack webhook URL"),
  newTickets: Joi.boolean().description("Notify on new tickets"),
  ticketAssignments: Joi.boolean().description("Notify on ticket assignments"),
  statusChanges: Joi.boolean().description("Notify on status changes"),
});

const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "Support Hub Internship Backend API",
    version: "1.0.0",
    description: "API documentation for Support Hub Internship Backend",
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
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
    "/api/users/profile/company": {
      put: {
        summary: "Update user company profile",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["id"],
                properties: {
                  id: {
                    type: "string",
                    description: "Client ID to update",
                  },
                  companyName: {
                    type: "string",
                    description: "Company name",
                  },
                  companyDomain: {
                    type: "string",
                    description: "Company domain",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Company profile updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    data: { type: "object" },
                  },
                },
              },
            },
          },
          "400": {
            description: "Bad request",
          },
          "401": {
            description: "Unauthorized",
          },
        },
      },
    },
    "/api/tickets/ranked": {
      get: {
        summary: "Get tickets ranked by priority score",
        description:
          "Returns all open tickets sorted by AI-computed priority score (highest first). Each ticket includes priorityScore (0–1) and lastScoredAt timestamp. Restricted to Admin and Ticket Manager roles.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Ranked ticket list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    data: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          ticketCode: { type: "string" },
                          title: { type: "string" },
                          description: { type: "string", nullable: true },
                          status: { type: "string" },
                          tags: { type: "array", items: { type: "string" } },
                          priorityScore: {
                            type: "number",
                            format: "float",
                            minimum: 0,
                            maximum: 1,
                            description: "AI priority score from 0 (lowest) to 1 (highest)",
                            nullable: true,
                          },
                          lastScoredAt: {
                            type: "string",
                            format: "date-time",
                            description: "When the priority score was last computed",
                            nullable: true,
                          },
                          createdAt: { type: "string", format: "date-time" },
                          updatedAt: { type: "string", format: "date-time" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
          "403": { description: "Forbidden: requires Admin or Ticket Manager role" },
        },
      },
    },
    "/api/settings/slack-integrations": {
      get: {
        summary: "Get Slack integration settings",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Slack settings retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    data: {
                      type: "object",
                      properties: {
                        slackWebhookUrl: { type: "string", nullable: true },
                        newTickets: { type: "boolean" },
                        ticketAssignments: { type: "boolean" },
                        statusChanges: { type: "boolean" },
                      },
                      nullable: true,
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Bad request",
          },
        },
      },
    },
    "/api/settings/slack-integration": {
      post: {
        summary: "Update Slack integration settings",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: j2s(slackSettingsValidation).swagger,
            },
          },
        },
        responses: {
          "200": {
            description: "Slack settings updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    data: j2s(slackSettingsValidation).swagger,
                  },
                },
              },
            },
          },
          "400": {
            description: "Bad request",
          },
        },
      },
      put: {
        summary: "Update Slack integration settings",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: j2s(slackSettingsValidation).swagger,
            },
          },
        },
        responses: {
          "200": {
            description: "Slack settings updated successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string" },
                    data: j2s(slackSettingsValidation).swagger,
                  },
                },
              },
            },
          },
          "400": {
            description: "Bad request",
          },
        },
      },
    },
  },
};

export function setupSwagger(app: Express) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}
