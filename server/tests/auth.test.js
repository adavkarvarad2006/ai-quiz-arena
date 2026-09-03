import request from "supertest";
import express from "express";
import dotenv from "dotenv";
import authRoutes from "../routes/authRoutes.js";
import { connectTestDB, closeTestDB, clearTestDB } from "./setup.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use("/api/auth", authRoutes);

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

afterEach(async () => {
  await clearTestDB();
});

describe("Auth API", () => {
  test("registers a new user successfully", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("token");
    expect(res.body.email).toBe("test@example.com");
    expect(res.body).not.toHaveProperty("password");
  });

  test("rejects duplicate email registration", async () => {
    await request(app).post("/api/auth/register").send({
      name: "Test User",
      email: "dupe@example.com",
      password: "password123",
    });

    const res = await request(app).post("/api/auth/register").send({
      name: "Another User",
      email: "dupe@example.com",
      password: "password456",
    });

    expect(res.status).toBe(400);
  });

  test("logs in with correct credentials", async () => {
    await request(app).post("/api/auth/register").send({
      name: "Login Test",
      email: "login@example.com",
      password: "password123",
    });

    const res = await request(app).post("/api/auth/login").send({
      email: "login@example.com",
      password: "password123",
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
  });

  test("rejects login with wrong password", async () => {
    await request(app).post("/api/auth/register").send({
      name: "Wrong Pass Test",
      email: "wrongpass@example.com",
      password: "password123",
    });

    const res = await request(app).post("/api/auth/login").send({
      email: "wrongpass@example.com",
      password: "wrongpassword",
    });

    expect(res.status).toBe(401);
  });

  test("rejects /me without a token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});