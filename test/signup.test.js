import request from "supertest";
import app from "../app.js";
import User from "../userModel.js";
import {
  connect,
  closeDatabase,
  clearDatabase,
} from "../test-units/db-handler.js";

beforeAll(async () => {
  await connect();
  await User.init(); // ensures unique indexes (email/username)
});

afterAll(async () => {
  await clearDatabase();
  await closeDatabase();
});

describe("POST /signup", () => {
  it("creates a new user", async () => {
    const res = await request(app).post("/signup").send({
      username: "testuser",
      email: "test@example.com",
      password: "password123",
    });

    expect(res.statusCode).toBe(201);
  });

  it("reject the dublicate user", async () => {
    const res = await request(app).post("/signup").send({
      username: "testuser",
      email: "test@example.com",
      password: "password123",
    });

    expect(res.statusCode).toBe(409);
  });

  it("rejects missing required fields", async () => {
    const res = await request(app).post("/signup").send({
      username: "",
      email: "test2@example.com",
      password: "password123",
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("All fields are required");
  });

  it("rejects a password shorter than 8 characters", async () => {
    const res = await request(app).post("/signup").send({
      username: "shortpassuser",
      email: "shortpass@example.com",
      password: "pass1",
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe(
      "Password must be at least 8 characters long",
    );
  });

  it("rejects a duplicate email used with a different username", async () => {
    const res = await request(app).post("/signup").send({
      username: "anotherusername",
      email: "test@example.com",
      password: "password123",
    });

    expect(res.statusCode).toBe(409);
    expect(res.body.message).toBe("Email already exists");
  });

  it("rejects an invalid email format", async () => {
    const res = await request(app).post("/signup").send({
      username: "bademailuser",
      email: "not-an-email",
      password: "password123",
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Validation failed");
  });
});
