import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import { FastifyInstance } from "fastify";
import mongoose from "mongoose";
import { resolveMongoUri, buildTestApp, clearDatabase, TestDb } from "./helpers";

// Integration tests need a MongoDB. Skip the whole suite when none is reachable
// (e.g. sandboxed environments with no network to fetch a binary/image).
const db: TestDb | null = await resolveMongoUri();
const describeDb = db ? describe : describe.skip;

if (!db) {
  // eslint-disable-next-line no-console
  console.warn(
    "[iam.test] No MongoDB available — skipping integration suite. " +
      "Set MONGO_TEST_URI or enable network access for mongodb-memory-server."
  );
}

let app: FastifyInstance;

beforeAll(async () => {
  if (!db) return;
  await mongoose.connect(db.uri);
  app = await buildTestApp();
});

afterAll(async () => {
  if (!db) return;
  await app.close();
  await mongoose.disconnect();
  await db.stop();
});

beforeEach(async () => {
  if (!db) return;
  await clearDatabase();
});

const post = (url: string, payload: unknown, headers: Record<string, string> = {}) =>
  app.inject({ method: "POST", url, payload, headers });

const registerApp = async (appName: string) => {
  const res = await post("/api/auth/register-app", { appName });
  return res.json().data as { clientId: string; clientSecret: string; appName: string };
};

describeDb("password auth", () => {
  it("registers a user and logs in", async () => {
    const reg = await post("/api/auth/register", {
      email: "alice@example.com",
      password: "secret123",
    });
    expect(reg.statusCode).toBe(200);
    expect(reg.json().data.email).toBe("alice@example.com");

    const login = await post("/api/auth/login", {
      email: "alice@example.com",
      password: "secret123",
    });
    expect(login.statusCode).toBe(200);
    expect(typeof login.json().token).toBe("string");
  });

  it("rejects a bad password", async () => {
    await post("/api/auth/register", { email: "bob@example.com", password: "secret123" });
    const login = await post("/api/auth/login", {
      email: "bob@example.com",
      password: "wrongpass",
    });
    expect(login.statusCode).toBe(400);
  });

  it("rejects duplicate registration", async () => {
    await post("/api/auth/register", { email: "dup@example.com", password: "secret123" });
    const again = await post("/api/auth/register", {
      email: "dup@example.com",
      password: "secret123",
    });
    expect(again.statusCode).toBe(400);
  });

  it("validates the request body (400)", async () => {
    const res = await post("/api/auth/register", { email: "not-an-email" });
    expect(res.statusCode).toBe(400);
  });
});

describeDb("application management", () => {
  it("registers, lists, fetches and rotates secret", async () => {
    const created = await registerApp("billing");
    expect(created.clientId).toBeTruthy();
    const originalSecret = created.clientSecret;

    const list = await app.inject({ method: "GET", url: "/api/apps" });
    expect(list.statusCode).toBe(200);
    expect(list.json().data).toHaveLength(1);

    const rotate = await post("/api/apps/billing/rotate-secret", {});
    expect(rotate.statusCode).toBe(200);
    expect(rotate.json().data.clientSecret).not.toBe(originalSecret);
  });

  it("rejects duplicate app names", async () => {
    await registerApp("crm");
    const again = await post("/api/auth/register-app", { appName: "crm" });
    expect(again.statusCode).toBe(400);
  });
});

describeDb("onboarding, access check and policy removal", () => {
  it("onboards a user and enforces policy access", async () => {
    const application = await registerApp("dashboard");
    await post("/api/auth/onboard-user", {
      email: "carol@example.com",
      appName: "dashboard",
      policies: ["read", "write"],
    });

    const headers = {
      "client-id": application.clientId,
      "client-secret": application.clientSecret,
    };

    const allowed = await post(
      "/api/access/check",
      { email: "carol@example.com", appName: "dashboard", policy: "read" },
      headers
    );
    expect(allowed.statusCode).toBe(200);
    expect(allowed.json().data.allowed).toBe(true);

    const denied = await post(
      "/api/access/check",
      { email: "carol@example.com", appName: "dashboard", policy: "delete" },
      headers
    );
    expect(denied.json().data.allowed).toBe(false);
  });

  it("rejects access checks without client credentials (401)", async () => {
    await registerApp("dashboard");
    const res = await post("/api/access/check", {
      email: "carol@example.com",
      appName: "dashboard",
      policy: "read",
    });
    expect(res.statusCode).toBe(401);
  });

  it("removes policies", async () => {
    await registerApp("reports");
    await post("/api/auth/onboard-user", {
      email: "dan@example.com",
      appName: "reports",
      policies: ["read", "write"],
    });

    const res = await post("/app-auth/remove-policies", {
      email: "dan@example.com",
      appName: "reports",
      policies: ["write"],
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.policies).toEqual(["read"]);
  });
});

describeDb("OTP flow", () => {
  it("requests and verifies an OTP", async () => {
    const application = await registerApp("portal");
    await post("/api/auth/onboard-user", {
      email: "erin@example.com",
      appName: "portal",
      policies: ["login"],
    });

    const reqOtp = await post("/app-auth/request-otp", { email: "erin@example.com" });
    expect(reqOtp.statusCode).toBe(200);

    // OTP is stored on the user; read it back to verify the flow end-to-end.
    const UserModel = (await import("@/models/user")).default;
    const user = await UserModel.findOne({ email: "erin@example.com" });
    expect(user?.otp).toBeTruthy();

    const verify = await post("/app-auth/verify-otp", {
      email: "erin@example.com",
      otp: user!.otp,
    });
    expect(verify.statusCode).toBe(200);
    expect(typeof verify.json().token).toBe("string");
    expect(verify.json().apps[0].appName).toBe("portal");
    expect(application.appName).toBe("portal");
  });

  it("rejects an invalid OTP", async () => {
    await post("/api/auth/register", { email: "frank@example.com", password: "secret123" });
    const verify = await post("/app-auth/verify-otp", {
      email: "frank@example.com",
      otp: "000000",
    });
    expect(verify.statusCode).toBe(400);
  });
});

describeDb("user management", () => {
  it("fetches and deletes a user", async () => {
    await post("/api/auth/register", { email: "gail@example.com", password: "secret123" });

    const get = await app.inject({ method: "GET", url: "/api/users/gail@example.com" });
    expect(get.statusCode).toBe(200);
    expect(get.json().data.email).toBe("gail@example.com");

    const del = await app.inject({ method: "DELETE", url: "/api/users/gail@example.com" });
    expect(del.statusCode).toBe(200);

    const after = await app.inject({ method: "GET", url: "/api/users/gail@example.com" });
    expect(after.statusCode).toBe(400);
  });
});
