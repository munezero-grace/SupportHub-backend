import dotenv from "dotenv";
dotenv.config();

import request from "supertest";
import app from "./index";
import { PrismaClient } from "@prisma/client";

let server: any;
const prisma = new PrismaClient();

beforeAll(async () => {
  server = app.listen(0);
});

afterAll(async () => {
  await prisma.$disconnect();
  await new Promise<void>((resolve) => server.close(resolve));
});

describe("GET /", () => {
  it("should return a success message", async () => {
    const response = await request(server).get("/api");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: "BP Ticket Backend API is running!",
    });
  });
});

describe("Auth Endpoints", () => {
  beforeEach(async () => {
    await prisma.userRoles.deleteMany();
    await prisma.users.deleteMany();
  });

  it("should sign up a new user with client role", async () => {
    const res = await request(server).post("/api/auth/signup").send({
      firstName: "Test",
      lastName: "User",
      email: "testuser@gmail.com",
      password: "Password123!",
    });
    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.token).toBeDefined();
    expect(res.body.message).toBe("User registered successfully.");
  });

  it("should login an existing user", async () => {
    await request(server).post("/api/auth/signup").send({
      firstName: "Test",
      lastName: "User",
      email: "testlogin@gmail.com",
      password: "Password123!",
    });

    const res = await request(server).post("/api/auth/login").send({
      email: "testlogin@gmail.com",
      password: "Password123!",
    });
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.token).toBeDefined();
    expect(res.body.message).toBe("Login successful.");
  });
});
