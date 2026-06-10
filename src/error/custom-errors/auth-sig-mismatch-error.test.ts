import { describe, expect, it } from "vitest";
import { WorkerErrorCodes } from "../error-codes";
import { AuthSigMismatchError } from "./auth-sig-mismatch-error";

describe("AuthSigMismatchError", () => {
  const error = new AuthSigMismatchError();

  it("extends WorkerError", () => {
    expect(error).toBeInstanceOf(Error);
  });

  it("has code AUTH_SIG_MISMATCH", () => {
    expect(error.code).toBe(WorkerErrorCodes.AUTH_SIG_MISMATCH);
  });

  it("has status 401", () => {
    expect(error.status).toBe(401);
  });

  it("has no param", () => {
    expect(error.param).toBeUndefined();
  });

  it("has no details", () => {
    expect(error.details).toBeUndefined();
  });

  it("mentions HMAC in the message", () => {
    expect(error.message).toContain("HMAC");
  });
});
