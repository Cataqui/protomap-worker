import { describe, expect, it } from "vitest";
import { KeyNotFoundError } from "./r2-source";

describe("KeyNotFoundError", () => {
  it("is an instance of Error", () => {
    const error = new KeyNotFoundError("Archive not found");
    expect(error).toBeInstanceOf(Error);
  });

  it("is an instance of KeyNotFoundError", () => {
    const error = new KeyNotFoundError("Archive not found");
    expect(error).toBeInstanceOf(KeyNotFoundError);
  });

  it("preserves the error message", () => {
    const error = new KeyNotFoundError("Custom message");
    expect(error.message).toBe("Custom message");
  });

  it("has the correct name", () => {
    const error = new KeyNotFoundError("test");
    expect(error.name).toBe("KeyNotFoundError");
  });
});
