import { describe, expect, it } from "vitest";
import { hasPermission, VELOS_CORE_VERSION } from "./index";

describe("@velos/iam-core scaffold", () => {
  it("exposes a version", () => {
    expect(VELOS_CORE_VERSION).toBe("0.0.0");
  });

  it("checks permissions", () => {
    expect(hasPermission(["orders:read"], "orders:read")).toBe(true);
    expect(hasPermission(["orders:read"], "billing:read")).toBe(false);
  });
});
