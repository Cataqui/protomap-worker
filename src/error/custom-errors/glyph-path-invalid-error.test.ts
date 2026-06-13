import { describe, expect, it } from "vitest";
import { WorkerErrorCodes } from "../error-codes";
import { GlyphPathInvalidError } from "./glyph-path-invalid-error";

describe("GlyphPathInvalidError", () => {
  const error = new GlyphPathInvalidError("../etc/passwd.pbf");

  it("extends WorkerError", () => {
    expect(error).toBeInstanceOf(Error);
  });

  it("has code GLYPH_PATH_INVALID", () => {
    expect(error.code).toBe(WorkerErrorCodes.GLYPH_PATH_INVALID);
  });

  it("has status 400", () => {
    expect(error.status).toBe(400);
  });

  it("includes the path in details", () => {
    expect(error.details).toEqual({ path: "../etc/passwd.pbf" });
  });

  it("includes the path in the message", () => {
    expect(error.message).toContain("../etc/passwd.pbf");
  });

  it("has no param", () => {
    expect(error.param).toBeUndefined();
  });
});
