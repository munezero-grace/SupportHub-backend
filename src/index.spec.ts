import request from "supertest";
import app from "./index";

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
