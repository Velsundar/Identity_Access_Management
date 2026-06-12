/**
 * @velos/iam-core — framework-agnostic Velos IAM client.
 *
 * Phase 0 scaffold: shared types and a minimal policy-evaluation helper. The
 * VelosClient (session manager, token refresh, auth events) lands in Phase 2.
 */

export const VELOS_CORE_VERSION = "0.0.0";

export interface VelosUser {
  userId: string;
  email: string;
  orgId?: string;
}

export interface RouteRule {
  path: string;
  methods: string[];
  effect: "allow" | "deny";
}

/** A user's effective access within a single application. */
export interface AppAccess {
  appId: string;
  appName?: string;
  roles: string[];
  permissions: string[];
  routes: RouteRule[];
}

export interface VelosSession {
  user: VelosUser;
  token: string;
  expiresAt: number;
  apps: AppAccess[];
}

/** True when `required` is present in the granted permission set. */
export const hasPermission = (granted: string[], required: string): boolean =>
  granted.includes(required);
