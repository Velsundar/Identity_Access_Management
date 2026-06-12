# Velos IAM SDK — Plan

> Goal: turn the `velos_iam` backend into a sellable **drop-in auth + access SDK**
> (Clerk/Auth0/Okta style). A company manages identity centrally; users sign in once and
> see every app they can access (SSO launchpad); each app reads the current user via
> hooks like `useUser()` / `useClient()` and enforces **route-level policies** defined as
> JSON. Admins manage who can access which app and with which policies from an **IAM admin
> console**.

This is the design of record. Implementation is incremental ("add on") per the phases
below.

## Confirmed decisions
- **Package scope:** `@velos/*`
- **Branch for SDK work:** `feature/iam-sdk` (created at the start of Phase 0)
- **Monorepo restructure:** yes — move the existing backend under `apps/backend`
- **Next.js:** required (admin console + a Next.js SDK package)
- **Policy model:** **Hybrid** — roles bundle permissions + route rules, with per-user
  permission/route overrides
- **Admin console:** build the Next.js dashboard UI as a first-class app

---

## 1. The three surfaces

1. **IAM admin console** (`apps/dashboard`, Next.js) — where the company's admins manage
   **Organizations → Applications → Users → Roles → Policies**: grant which users can
   access which applications, and define each role/user's permissions and **route access**
   (edited/stored as JSON).
2. **Account portal / SSO launchpad** (`apps/account-portal`, Next.js) — the central
   sign-in. After login it **lists every app the user can access** as tiles and
   **redirects into the chosen app already authenticated** (SSO).
3. **The customer's apps** — install `@velos/iam-react` (or `@velos/iam-nextjs`) and read
   the current user + enforce policies.

---

## 2. Developer experience (what the customer writes)

**Frontend (React/Next.js):**
```tsx
<VelosProvider publishableKey="pk_live_xxx">
  <App />
</VelosProvider>

const { user, isSignedIn } = useUser();
const { has, signOut } = useAuth();

<SignedIn><Dashboard /></SignedIn>
<SignedOut><SignIn /></SignedOut>
<Protect role="manager">       {/* role */}
<Protect permission="billing:read"> {/* permission */}
```

**Backend (the customer's API):**
```ts
import { requireAuth, getAuth } from "@velos/iam-node";

app.get("/orders", requireAuth({ permission: "orders:read" }), (req, res) => {
  const { userId, orgId, roles, permissions } = getAuth(req); // verified from token
});
```

---

## 3. Policy model (Hybrid RBAC + route overrides), as JSON

**Roles are defined per Application** (a reusable bundle):
```jsonc
// Application.roles[]
{
  "name": "manager",
  "permissions": ["orders:read", "orders:write", "billing:read"],
  "routes": [
    { "path": "/orders/**", "methods": ["GET", "POST"], "effect": "allow" },
    { "path": "/admin/**",  "methods": ["*"],           "effect": "deny"  }
  ]
}
```

**A user's policy for an app** assigns roles + optional overrides:
```jsonc
// Policy { userId, appId, ... }
{
  "userId": "u_123",
  "appId": "app_shop",
  "roles": ["manager"],
  "permissions": ["reports:read"],            // extra, on top of roles
  "routes": [                                  // per-user overrides
    { "path": "/billing/**", "methods": ["*"], "effect": "deny" }
  ]
}
```

**Effective access (evaluation engine):**
- `permissions` = union of all assigned roles' permissions + user's extra permissions.
- `routes` = roles' route rules, then user overrides layered on top.
- **Resolution rules:** `deny` overrides `allow`; the **most specific path** wins; method
  `*` matches any. Default is deny when nothing matches.
- Exposed to the SDK via the token claims and a `/v1/client/me` payload so `has()` /
  `<Protect>` / `requireAuth()` all evaluate consistently. A shared
  `@velos/iam-core` evaluator is reused on client and server.

---

## 4. Architecture

### a) Publishable vs secret keys
Browser holds only the **publishable key** (`pk_…` = `clientId`). The **secret key**
(`sk_…` = `clientSecret`) is server-only (`@velos/iam-node`). Secret never ships to the browser.

### b) Asymmetric tokens + JWKS
Sign JWTs with **RS256/EdDSA**, publish **`/.well-known/jwks.json`** so any resource
server verifies tokens offline (replaces the current shared HS256 secret). Token carries
`userId`, `orgId`, `appId`, `roles`, `permissions` (+ a route-policy hash/version).

### c) Sessions & cross-app SSO
- The Velos domain is the shared **Frontend API**; the primary session is an **httpOnly,
  Secure, SameSite cookie** on that domain.
- Each app's SDK calls `POST /v1/client/sessions` on load → if the shared cookie exists,
  it mints a **short-lived (~5–15 min) app-scoped JWT** without re-login = SSO.
- Access tokens live **in memory**, silently refreshed from the cookie (XSS-resistant).

### d) Multi-tenancy
- New **`Organization { orgId, name }`** (the "company").
- `Application` gains `orgId`, `allowedOrigins[]` (per-app CORS), and `roles[]`.
- `User` belongs to an org (membership). SSO is shared **only across apps of the same org**.

---

## 5. Monorepo layout

pnpm workspaces + Turborepo; packages built with tsup (ESM + CJS + d.ts).

```
apps/
  backend/          # Fastify IAM service (moved here): Frontend API + Management API
  dashboard/        # Next.js — IAM admin console
  account-portal/   # Next.js — SSO launchpad / central sign-in
  example-shop/     # demo customer app  ─┐ prove SSO + policies
  example-admin/    # demo customer app  ─┘
packages/
  iam-core/         # @velos/iam-core   — client, session mgr, policy evaluator, events
  iam-react/        # @velos/iam-react  — provider, hooks, control + prebuilt components
  iam-nextjs/       # @velos/iam-nextjs — middleware, server components, route helpers
  iam-node/         # @velos/iam-node   — verifyToken (JWKS), requireAuth, admin API
docs/
```

---

## 6. Backend work

**Frontend API** (CORS, publishable-key scoped): `/v1/client/sign-up`, `/sign-in`,
`/verify-otp`, `/me`, `/sessions`, `/sessions/refresh`, `/sign-out`, `/.well-known/jwks.json`.

**Management API** (secret-key / admin-session scoped, powers the dashboard):
orgs, applications, users, **roles per app**, assign roles/policies to users, list a
user's accessible apps (feeds the launchpad).

**Cross-cutting:** RS256 keys + JWKS, httpOnly SSO cookie + CSRF, per-app origin
allowlist, rate limiting, `Organization` model + `orgId` wiring, the shared **policy
evaluation engine** in `@velos/iam-core` (reused by backend + SDKs).

---

## 7. Phased delivery

- **Phase 0 — Monorepo scaffold:** branch `feature/iam-sdk`; pnpm/Turbo/tsup; move backend
  to `apps/backend`; keep tests green.
- **Phase 1 — Backend foundations:** `Organization` model, RS256 + JWKS, publishable-key
  scoping, per-app CORS, rate limiting, hybrid **policy schema** (roles on Application,
  policy overrides on user) + evaluation engine, `/v1/client/me`.
- **Phase 2 — `@velos/iam-core`:** client, session manager, token refresh, policy
  evaluator, auth events.
- **Phase 3 — `@velos/iam-react` (headless):** provider + `useUser`/`useAuth`/`useClient`,
  `<SignedIn>/<SignedOut>/<Protect>`.
- **Phase 4 — Prebuilt UI:** `<SignIn>`, `<SignUp>`, `<UserButton>` (themeable).
- **Phase 5 — `@velos/iam-node` + `@velos/iam-nextjs`:** `verifyToken`, `requireAuth`,
  Next.js middleware/server helpers, admin API client.
- **Phase 6 — Admin console (`apps/dashboard`):** manage orgs/apps/users/roles/policies,
  JSON policy editor, access grants.
- **Phase 7 — Account portal + SSO end-to-end:** launchpad listing accessible apps,
  redirect-with-session; two example apps sharing one login to prove it.
- **Phase 8 — Release:** Changesets versioning, build/publish pipeline, docs; choose
  registry (public npm vs private/licensed).
