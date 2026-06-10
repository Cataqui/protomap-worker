import { describe, expect, it } from "vitest";
import { WorkerErrorCodes } from "../error-codes";
import { AuthSigInvalidHexError } from "./auth-sig-invalid-hex-error";

describe("AuthSigInvalidHexError", () => {
  const error = new AuthSigInvalidHexError();

  it("extends WorkerError", () => {
    expect(error).toBeInstanceOf(Error);
  });

  it("has code AUTH_SIG_INVALID_HEX", () => {
    expect(error.code).toBe(WorkerErrorCodes.AUTH_SIG_INVALID_HEX);
  });

  it("has status 401", () => {
    expect(error.status).toBe(401);
  });

  it("has param set to sig", () => {
    expect(error.param).toBe("sig");
  });

  it("mentions hex in the message", () => {
    expect(error.message).toContain("hex");
  });

  it("has no details", () => {
    expect(error.details).toBeUndefined();
  });
});
