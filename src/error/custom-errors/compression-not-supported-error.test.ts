import { describe, expect, it } from "vitest";
import { WorkerErrorCodes } from "../error-codes";
import { CompressionNotSupportedError } from "./compression-not-supported-error";

describe("CompressionNotSupportedError", () => {
  const error = new CompressionNotSupportedError("Brotli");

  it("extends WorkerError", () => {
    expect(error).toBeInstanceOf(Error);
  });

  it("has code COMPRESSION_NOT_SUPPORTED", () => {
    expect(error.code).toBe(WorkerErrorCodes.COMPRESSION_NOT_SUPPORTED);
  });

  it("has status 501", () => {
    expect(error.status).toBe(501);
  });

  it("has no param", () => {
    expect(error.param).toBeUndefined();
  });

  it("includes the compression method in details", () => {
    expect(error.details).toEqual({ method: "Brotli" });
  });

  it("includes the method in the message", () => {
    expect(error.message).toContain("Brotli");
  });
});
