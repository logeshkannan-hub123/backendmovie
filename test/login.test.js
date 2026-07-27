import request from "supertest";
import app from "../app.js";
import User from "../userModel.js";
import { connect, closeDatabase } from "../test-units/db-handler.js";

let token = "";

beforeAll(async () => {
  await connect();
  await User.init();

  // Seed a user through the real /signup endpoint so the password
  // is hashed exactly the way it would be in production.
  await request(app).post("/signup").send({
    username: "kannan",
    email: "kannan@gmail.com",
    password: "kannan123",
  });
});

afterAll(async () => {
  await closeDatabase();
});

describe("POST /login", () => {
  it("should login successfully", async () => {
    const res = await request(app).post("/login").send({
      email: "kannan@gmail.com",
      password: "kannan123",
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();

    token = res.body.token;
  });

  it("should reject wrong password", async () => {
    const res = await request(app).post("/login").send({
      email: "kannan@gmail.com",
      password: "wrongpassword",
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe("GET /movies", () => {
  it("should return all movies for the logged-in user", async () => {
    const res = await request(app)
      .get("/movies")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("should reject a request with no token", async () => {
    const res = await request(app).get("/movies");

    expect(res.status).toBe(401);
  });
});
