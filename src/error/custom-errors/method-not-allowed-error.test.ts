import { describe, expect, it } from "vitest";
import { WorkerErrorCodes } from "../error-codes";
import { MethodNotAllowedError } from "./method-not-allowed-error";

describe("MethodNotAllowedError", () => {
  const error = new MethodNotAllowedError("POST");

  it("extends WorkerError", () => {
    expect(error).toBeInstanceOf(Error);
  });

  it("has code METHOD_NOT_ALLOWED", () => {
    expect(error.code).toBe(WorkerErrorCodes.METHOD_NOT_ALLOWED);
  });

  it("has status 405", () => {
    expect(error.status).toBe(405);
  });

  it("has no param", () => {
    expect(error.param).toBeUndefined();
  });

  it("has no details", () => {
    expect(error.details).toBeUndefined();
  });

  it("includes the method in the message", () => {
    expect(error.message).toContain("POST");
  });
});
