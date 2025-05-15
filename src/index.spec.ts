import request from "supertest";
import app from "./index";
import { PrismaClient } from "@prisma/client";

let server: any;
const prisma = new PrismaClient();

describe("GET /", () => {
  beforeAll((done) => {
    server = app.listen(0, done);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    if (server) server.close();
  });

  it("should return a success message", async () => {
    const response = await request(server).get("/");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      statusCode: 200,
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
    const res = await request(server).post("/auth/signup").send({
      firstName: "Test",
      lastName: "User",
      email: "testuser@example.com",
      password: "Password123!",
    });
    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.token).toBeDefined();
    expect(res.body.message).toBe("User registered successfully.");
  });

  it("should login an existing user", async () => {
    await request(server).post("/auth/signup").send({
      firstName: "Test",
      lastName: "User",
      email: "testlogin@example.com",
      password: "Password123!",
    });

    const res = await request(server).post("/auth/login").send({
      email: "testlogin@example.com",
      password: "Password123!",
    });
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.token).toBeDefined();
    expect(res.body.message).toBe("Login successful.");
  });

  it("should sign in or sign up with Google", async () => {
    const res = await request(server).post("/auth/google-signin").send({
      email: "googletest@example.com",
      firstName: "Google",
      lastName: "User",
    });
    expect([200, 201]).toContain(res.status);
    expect(res.body.user).toBeDefined();
    expect(res.body.token).toBeDefined();
    expect(res.body.message).toBe("Login successful.");
  });
});
