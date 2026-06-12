# Velos IAM SDK — Plan

> Goal: turn the `velos_iam` backend into a sellable **drop-in auth SDK** (Clerk/Auth0
> style). A company with N apps installs the SDK in each app; users sign in once and
> are recognized across all the company's apps (SSO), and each app reads the current
> user with hooks like `useUser()` / `useClient()` and enforces its own policies.

This is a planning document. Implementation will be incremental ("add on") in the
phases below. No code is written yet.

---

## 1. Product shape (what the customer experiences)

**Frontend (React):**
```tsx
// once, at the app root
<VelosProvider publishableKey="pk_live_xxx">
  <App />
</VelosProvider>

// anywhere
const { user, isSignedIn, isLoaded } = useUser();
const { signOut, getToken } = useAuth();

<SignedIn><Dashboard /></SignedIn>
<SignedOut><SignIn /></SignedOut>
<Protect policy="billing:read"><Billing /></Protect>
```

**Backend (the customer's own API):**
```ts
import { requireAuth, getAuth } from "@velos/iam-node";

app.get("/api/data", requireAuth(), (req, res) => {
  const { userId, orgId, policies } = getAuth(req); // verified from the token
});
```

The "import current user inside the client" you described = `useUser()` / `useClient()`,
backed by a verified session token from the Velos backend.

---

## 2. Key architectural decisions

### a) Publishable key vs secret key (browser safety)
The browser must **never** hold `clientSecret`. We split credentials like Clerk:
- **Publishable key** (`pk_...`) = the app's `clientId`, safe in the browser. Scopes
  requests to one application; sent as a header to the Frontend API.
- **Secret key** (`sk_...`) = the app's `clientSecret`, used **only** by `@velos/iam-node`
  for admin calls and (optionally) token verification.

### b) Asymmetric tokens + JWKS (so anyone can verify offline)
Switch JWT signing from the current shared HS256 secret to **RS256 (or EdDSA)** with a
published **`/.well-known/jwks.json`**. The Node SDK and any resource server verify
tokens with the public key — no shared secret to distribute. Critical for selling.

### c) Sessions & cross-app SSO
- The Velos backend becomes the **shared auth domain** (the "Frontend API"). The primary
  session lives in an **httpOnly, Secure, SameSite cookie on the Velos domain**.
- Each app's SDK, on load, calls `POST /v1/client/sessions` → if the shared cookie
  exists, the backend mints a **short-lived app-scoped JWT (~5–15 min)** without
  re-login. That's SSO across the company's 5 apps.
- Access tokens are short-lived and held **in memory**; they're silently refreshed from
  the shared cookie (no localStorage → XSS-resistant).

### d) Multi-tenancy ("a company with 5 apps")
Add an **Organization (tenant)** concept so SSO is scoped correctly:
- New `Organization { orgId, name }`.
- `Application` gains `orgId` (which company owns it) + `allowedOrigins[]` (CORS).
- `User` belongs to an org (membership). SSO is shared **only among apps of the same org**.
- Policies stay per `(userId, appId)` — already a perfect fit, no change to the core model.

---

## 3. Monorepo layout

Convert the repo to a **pnpm workspace + Turborepo**, build packages with **tsup**
(ESM + CJS + d.ts). The existing backend moves under `apps/backend`.

```
apps/
  backend/                # current Fastify IAM service (moved here)
  example-shop/           # demo app #1  ─┐ share one login
  example-admin/          # demo app #2  ─┘ to prove SSO
packages/
  iam-core/               # @velos/iam-core  — framework-agnostic client
  iam-react/              # @velos/iam-react — provider, hooks, components
  iam-node/               # @velos/iam-node  — token verify + admin + middleware
docs/
```

- `@velos/iam-core`: `VelosClient` class — HTTP client, session manager (load/refresh/
  expiry), pluggable storage, an `onAuthChange` event emitter, `getToken()`. Pure TS,
  runs in browser and Node.
- `@velos/iam-react`: `<VelosProvider>`, hooks `useUser` / `useAuth` / `useClient` /
  `useSession`, control components `<SignedIn>` `<SignedOut>` `<Protect>`, and **prebuilt
  UI** `<SignIn>` `<SignUp>` `<UserButton>`. Thin layer over `iam-core` + React context.
- `@velos/iam-node`: `verifyToken()` (via JWKS), `requireAuth()` middleware
  (Express + Fastify adapters), `getAuth(req)`, plus admin helpers (create user, onboard,
  manage policies) using the secret key.

> Package scope `@velos/*` is a placeholder — final brand/scope name TBD.

---

## 4. Backend changes required (to power the SDK)

A new versioned **Frontend API** (CORS-enabled, scoped by publishable key):

| Method | Endpoint                          | Purpose                                   |
| ------ | --------------------------------- | ----------------------------------------- |
| POST   | `/v1/client/sign-up`              | Email + password (or OTP) registration    |
| POST   | `/v1/client/sign-in`              | Password / start OTP                       |
| POST   | `/v1/client/verify-otp`           | Complete OTP sign-in                       |
| GET    | `/v1/client/me`                   | **Current user** from the session token    |
| POST   | `/v1/client/sessions`             | Mint app-scoped token (SSO via cookie)     |
| POST   | `/v1/client/sessions/refresh`     | Rotate the short-lived access token        |
| POST   | `/v1/client/sign-out`             | Clear session / cookie                     |
| GET    | `/.well-known/jwks.json`          | Public keys for offline verification       |

Supporting work:
- RS256 key pair + key management (env / KMS later) and JWKS.
- httpOnly SSO cookie on the Velos domain + CSRF protection for cookie refresh.
- Per-app **origin allowlist** → dynamic CORS.
- **Rate limiting** on auth endpoints (`@fastify/rate-limit`).
- `Organization` model + wire `orgId` onto Application/User.
- Reuse existing flows where possible (current `register`, `login`, OTP services map
  almost 1:1 onto the new `/v1/client/*` handlers).

---

## 5. Phased delivery (incremental)

- **Phase 0 — Monorepo scaffold:** pnpm workspaces, Turborepo, tsup, shared tsconfig;
  move backend to `apps/backend`; keep tests green.
- **Phase 1 — Backend auth foundations:** RS256 + JWKS, `Organization` model,
  publishable-key scoping, per-app CORS, `/v1/client/me`, rate limiting.
- **Phase 2 — `@velos/iam-core`:** client, session manager, storage, events, token refresh.
- **Phase 3 — `@velos/iam-react` (headless):** provider + `useUser`/`useAuth`/`useClient`,
  `<SignedIn>/<SignedOut>/<Protect>`.
- **Phase 4 — Prebuilt UI:** `<SignIn>`, `<SignUp>`, `<UserButton>` (themeable).
- **Phase 5 — `@velos/iam-node`:** `verifyToken`, `requireAuth` middleware, admin API.
- **Phase 6 — SSO end-to-end:** shared-domain session + the two example apps sharing one
  login (proves the "5 apps, one sign-in" story).
- **Phase 7 — Release:** Changesets versioning, build/publish pipeline, docs; choose
  registry (public npm vs private/licensed).

---

## 6. Open items to confirm before Phase 0

1. **Brand / package scope** — `@velos/*`? (drives package names everywhere).
2. **Branch** — current branch name contains a disallowed word; SDK work should use a
   clean branch (e.g. `feature/iam-sdk`). Needs explicit go-ahead to push there.
3. **Monorepo restructure** — OK to move the existing backend into `apps/backend`?
4. **Next.js package** — needed soon, or React-first is fine soon, Next later?
