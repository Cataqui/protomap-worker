import { describe, expect, it } from "vitest";
import { WorkerErrorCodes } from "../error-codes";
import { AuthExpInvalidError } from "./auth-exp-invalid-error";

describe("AuthExpInvalidError", () => {
  const error = new AuthExpInvalidError("notanumber");

  it("extends WorkerError", () => {
    expect(error).toBeInstanceOf(Error);
  });

  it("has code AUTH_EXP_INVALID", () => {
    expect(error.code).toBe(WorkerErrorCodes.AUTH_EXP_INVALID);
  });

  it("has status 401", () => {
    expect(error.status).toBe(401);
  });

  it("has param set to exp", () => {
    expect(error.param).toBe("exp");
  });

  it("includes the provided value in details", () => {
    expect(error.details).toEqual({ provided: "notanumber" });
  });

  it("includes the provided value in the message", () => {
    expect(error.message).toContain("notanumber");
  });
});
