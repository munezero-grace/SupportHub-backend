import dotenv from "dotenv";
dotenv.config();

import request from "supertest";
import app from "./index";
import { prisma } from "./controllers/authController";

beforeEach(async () => {
  
  await prisma.userRoles.deleteMany();
  await prisma.users.deleteMany();
});

describe("GET /", () => {
  it("should return a success message", async () => {
    const response = await request(app).get("/");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      statusCode: 200,
      message: "BP Ticket Backend API is running!",
    });
  });
});

describe("POST /auth/google-signin", () => {
  it("should create a new user with the client role if the user does not exist", async () => {
    console.log("Testing user creation with client role...");
    const response = await request(app).post("/auth/google-signin").send({
      email: "testuser@example.com",
      firstName: "Test",
      lastName: "User",
    });

    console.log("Response:", response.body);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("token");
    expect(response.body.user).toMatchObject({
      email: "testuser@example.com",
      firstName: "Test",
      lastName: "User",
    });
  });

  it("should return an existing user if the user already exists", async () => {
    console.log("Testing existing user retrieval...");


    await prisma.users.create({
      data: {
        email: "existinguser@example.com",
        firstName: "Existing",
        lastName: "User",
      },
    });

    const response = await request(app).post("/auth/google-signin").send({
      email: "existinguser@example.com",
      firstName: "Existing",
      lastName: "User",
    });

    console.log("Response:", response.body);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("token");
    expect(response.body.user).toMatchObject({
      email: "existinguser@example.com",
      firstName: "Existing",
      lastName: "User",
    });
  });
});
