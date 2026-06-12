import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { FastifyInstance } from "fastify";
import { buildTestApp } from "./helpers";

/**
 * No-database smoke tests: verify the app boots, every plugin/route registers,
 * Swagger generates, request validation runs, and the client-credential guard
 * rejects unauthenticated callers — none of which touch MongoDB.
 */
let app: FastifyInstance;

beforeAll(async () => {
  app = await buildTestApp();
});

afterAll(async () => {
  await app.close();
});

describe("app wiring (no DB)", () => {
  it("responds on /health", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });

  it("serves Swagger docs", async () => {
    const res = await app.inject({ method: "GET", url: "/docs/json" });
    expect(res.statusCode).toBe(200);
    expect(res.json().info.title).toBe("Velos IAM API");
  });

  it("rejects an invalid register body before hitting the DB (400)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { email: "not-an-email" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("rejects access checks without client credentials (401)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/access/check",
      payload: { email: "a@b.com", appName: "x", policy: "read" },
    });
    expect(res.statusCode).toBe(401);
  });
});
