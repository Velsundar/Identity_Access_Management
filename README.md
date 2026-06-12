# Velos IAM

A drop-in **Identity & Access Management** platform and SDK. A company manages
identity centrally; users sign in once and reach every app they can access (SSO),
and each app reads the current user via React hooks and enforces route-level
policies defined as JSON.

This is a **pnpm + Turborepo monorepo**.

## Layout

```
apps/
  backend/          # Fastify IAM service (Frontend API + Management API)
  dashboard/        # Next.js IAM admin console            (planned)
  account-portal/   # Next.js SSO launchpad / sign-in      (planned)
packages/
  iam-core/         # @velos/iam-core   — framework-agnostic client + policy types
  iam-react/        # @velos/iam-react  — provider, hooks, prebuilt components
  iam-nextjs/       # @velos/iam-nextjs — Next.js middleware + server helpers
  iam-node/         # @velos/iam-node   — verifyToken, requireAuth, admin API
docs/
  SDK_PLAN.md       # full design & phased roadmap
```

## Getting started

```bash
pnpm install        # install all workspaces
pnpm build          # build every package (Turborepo)
pnpm test           # run all test suites
pnpm dev            # run dev tasks
```

Run a single workspace, e.g. the backend:

```bash
pnpm --filter @velos/backend dev
```

## Status

Scaffolded in **Phase 0** (monorepo + backend moved to `apps/backend`). The SDK
packages are stubs that build and type-check; functionality is filled in per the
roadmap in [`docs/SDK_PLAN.md`](./docs/SDK_PLAN.md).

See [`apps/backend/README.md`](./apps/backend/README.md) for backend specifics.
