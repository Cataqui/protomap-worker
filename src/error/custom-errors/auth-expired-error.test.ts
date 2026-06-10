import { describe, expect, it } from "vitest";
import { WorkerErrorCodes } from "../error-codes";
import { AuthExpiredError } from "./auth-expired-error";

describe("AuthExpiredError", () => {
  const error = new AuthExpiredError(1717977600);

  it("extends WorkerError", () => {
    expect(error).toBeInstanceOf(Error);
  });

  it("has code AUTH_EXPIRED", () => {
    expect(error.code).toBe(WorkerErrorCodes.AUTH_EXPIRED);
  });

  it("has status 403", () => {
    expect(error.status).toBe(403);
  });

  it("has param set to exp", () => {
    expect(error.param).toBe("exp");
  });

  it("includes the expired timestamp in details", () => {
    expect(error.details).toEqual({ exp: 1717977600 });
  });

  it("includes the expiry in the message", () => {
    expect(error.message).toContain("1717977600");
  });
});
