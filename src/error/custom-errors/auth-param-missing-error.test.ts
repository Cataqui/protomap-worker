import { describe, expect, it } from "vitest";
import { WorkerErrorCodes } from "../error-codes";
import { AuthParamMissingError } from "./auth-param-missing-error";

describe("AuthParamMissingError", () => {
  const error = new AuthParamMissingError("sig");

  it("extends WorkerError", () => {
    expect(error).toBeInstanceOf(Error);
  });

  it("has code AUTH_PARAM_MISSING", () => {
    expect(error.code).toBe(WorkerErrorCodes.AUTH_PARAM_MISSING);
  });

  it("has status 401", () => {
    expect(error.status).toBe(401);
  });

  it("has param set to the missing parameter name", () => {
    expect(error.param).toBe("sig");
  });

  it("includes the param in the message", () => {
    expect(error.message).toContain("'sig'");
  });

  it("has no details", () => {
    expect(error.details).toBeUndefined();
  });
});
