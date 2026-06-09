import { describe, expect, it } from "vitest";
import { AUTH_VERSIONS } from "./auth-versions";
import { V1AuthHandler } from "./v1-auth-handler";

describe("VERSIONS", () => {
  it("has version '1' registered", () => {
    expect(AUTH_VERSIONS["1"]).toBeDefined();
  });

  it("maps version '1' to a V1AuthHandler instance", () => {
    expect(AUTH_VERSIONS["1"]).toBeInstanceOf(V1AuthHandler);
  });

  it("every handler has an authenticate method", () => {
    for (const [_version, handler] of Object.entries(AUTH_VERSIONS)) {
      expect(typeof handler.authenticate).toBe("function");
    }
  });

  it("has no unexpected versions", () => {
    const keys = Object.keys(AUTH_VERSIONS);
    expect(keys).toEqual(["1"]);
  });
});
