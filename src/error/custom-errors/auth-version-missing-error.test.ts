import { describe, expect, it } from "vitest";
import { WorkerErrorCodes } from "../error-codes";
import { AuthVersionMissingError } from "./auth-version-missing-error";

describe("AuthVersionMissingError", () => {
  const error = new AuthVersionMissingError(["1", "2"]);

  it("extends WorkerError", () => {
    expect(error).toBeInstanceOf(Error);
  });

  it("has code AUTH_VERSION_MISSING", () => {
    expect(error.code).toBe(WorkerErrorCodes.AUTH_VERSION_MISSING);
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

  it("includes supported versions in the message", () => {
    expect(error.message).toContain("1, 2");
  });
});
