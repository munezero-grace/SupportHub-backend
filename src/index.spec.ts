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
  it("should create a new user with the client role and save provider details if the user does not exist", async () => {
    const response = await request(app).post("/auth/google-signin").send({
      email: "testuser@example.com",
      firstName: "Test",
      lastName: "User",
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("token");
    expect(response.body.user).toMatchObject({
      email: "testuser@example.com",
      firstName: "Test",
      lastName: "User",
      provider: "google",
      providerId: "google-id",
    });

    const userInDb = await prisma.users.findUnique({
      where: { email: "testuser@example.com" },
    });
    expect(userInDb).toBeTruthy();
    expect(userInDb?.provider).toBe("google");
    expect(userInDb?.providerId).toBe("google-id");
  });

  it("should return an existing user with provider details if the user already exists", async () => {
    await prisma.users.create({
      data: {
        email: "existinguser@example.com",
        firstName: "Existing",
        lastName: "User",
        provider: "google",
        providerId: "existing-google-id",
      },
    });

    const response = await request(app).post("/auth/google-signin").send({
      email: "existinguser@example.com",
      firstName: "Existing",
      lastName: "User",
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("token");
    expect(response.body.user).toMatchObject({
      email: "existinguser@example.com",
      firstName: "Existing",
      lastName: "User",
      provider: "google",
      providerId: "existing-google-id",
    });
  });
});
