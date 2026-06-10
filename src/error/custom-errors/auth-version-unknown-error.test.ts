import { describe, expect, it } from "vitest";
import { WorkerErrorCodes } from "../error-codes";
import { AuthVersionUnknownError } from "./auth-version-unknown-error";

describe("AuthVersionUnknownError", () => {
  const error = new AuthVersionUnknownError("3", ["1", "2"]);

  it("extends WorkerError", () => {
    expect(error).toBeInstanceOf(Error);
  });

  it("has code AUTH_VERSION_UNKNOWN", () => {
    expect(error.code).toBe(WorkerErrorCodes.AUTH_VERSION_UNKNOWN);
  });

  it("has status 401", () => {
    expect(error.status).toBe(401);
  });

  it("no param", () => {
    expect(error.param).toBeUndefined();
  });

  it("includes provided and supported versions in details", () => {
    expect(error.details).toEqual({ provided: "3", supported: ["1", "2"] });
  });

  it("includes the provided version in the message", () => {
    expect(error.message).toContain("'3'");
  });
});
