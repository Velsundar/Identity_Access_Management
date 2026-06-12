# Velos IAM

A lightweight **Identity & Access Management** service: register applications,
onboard users with per-application policies, authenticate users (password or
email OTP), issue JWTs, and answer access-control questions
("does this user hold this policy for this app?").

## Tech stack

- **Runtime:** Node.js 22 + TypeScript
- **Web framework:** Fastify 5 (with `@fastify/jwt`, `@fastify/cors`, `@fastify/swagger`)
- **Database:** MongoDB via Mongoose
- **Auth:** JWT, bcrypt-hashed passwords, email OTP (nodemailer)
- **Tests:** Vitest + `mongodb-memory-server` (via Fastify `inject`)

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env       # then edit MONGO_URI, JWT_SECRET, etc.

# 3. Run in dev (hot reload)
npm run dev

# 4. Or build + run
npm run build
npm start
```

The API listens on `PORT` (default **4000**). Interactive API docs (Swagger UI)
are served at **`/docs`**, and a health probe at **`/health`**.

### Run everything with Docker

```bash
docker compose up --build
```

This starts MongoDB and the API together (the API waits for Mongo to be healthy).

## Scripts

| Script          | Description                                  |
| --------------- | -------------------------------------------- |
| `npm run dev`   | Hot-reloading dev server (`ts-node-dev`)     |
| `npm run build` | Compile TypeScript to `dist/` (+ path fixup) |
| `npm start`     | Run the compiled server                      |
| `npm test`      | Run the Vitest suite                         |

## Environment variables

See [`.env.example`](./.env.example). Key ones: `PORT`, `MONGO_URI`,
`JWT_SECRET`, and the `SMTP_*` group for OTP email delivery. In non-production
mode, OTPs are logged to the console so SMTP is optional during development.

## API overview

| Method | Path                            | Description                                  | Auth                |
| ------ | ------------------------------- | -------------------------------------------- | ------------------- |
| POST   | `/api/auth/register`            | Register a user with email + password        | —                   |
| POST   | `/api/auth/login`               | Password login → JWT                         | —                   |
| POST   | `/api/auth/register-app`        | Register an application (issues credentials) | —                   |
| POST   | `/api/auth/onboard-user`        | Onboard a user to an app with policies       | —                   |
| POST   | `/app-auth/request-otp`         | Email an OTP to a user                        | —                   |
| POST   | `/app-auth/verify-otp`          | Verify OTP → JWT + the user's apps/policies   | —                   |
| POST   | `/app-auth/remove-policies`     | Remove policies from a user for an app        | —                   |
| GET    | `/api/users`                    | List users                                    | —                   |
| GET    | `/api/users/:email`             | Get a user and their policies                 | —                   |
| DELETE | `/api/users/:email`             | Delete a user                                 | —                   |
| GET    | `/api/apps`                     | List applications                             | —                   |
| GET    | `/api/apps/:appName`            | Get an application                            | —                   |
| POST   | `/api/apps/:appName/rotate-secret` | Rotate an app's client secret              | —                   |
| DELETE | `/api/apps/:appName`            | Delete an application                         | —                   |
| POST   | `/api/access/check`             | Check if a user holds a policy for an app      | `client-id` + `client-secret` headers |

## Data model

- **User** — `email`, `userId`, hashed `password`, transient `otp`/`otpExpiresAt`
- **Application** — `appName`, `appId`, `clientId`, `clientSecret`
- **Policy** — links a `userId` and `appId` to a list of policy strings

## Testing notes

The integration suite uses an in-memory MongoDB (`mongodb-memory-server`), which
downloads a Mongo binary on first run. In sandboxed/offline environments that
download is blocked, so the integration suite **auto-skips** and only the no-DB
smoke tests run. To run the full suite against an existing MongoDB, set:

```bash
MONGO_TEST_URI=mongodb://localhost:27017/velos_iam_test npm test
```

## Project structure

```
src/
  app.ts            # buildApp() — registers plugins & routes
  server.ts         # entrypoint (listen)
  config/env.ts     # env loading
  plugins/          # mongodb, jwt
  models/           # User, Application, Policy (Mongoose)
  routes/           # auth, app-auth, users, apps, access
  services/         # business logic
  middleware/       # authenticateApp (client-credential guard)
  utils/            # responses, otp, email, route handler
tests/              # smoke + integration (Vitest)
```
