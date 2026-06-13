import { describe, expect, it } from "vitest";
import { WorkerErrorCodes } from "../error-codes";
import { GlyphNotFoundError } from "./glyph-not-found-error";

describe("GlyphNotFoundError", () => {
  const error = new GlyphNotFoundError("Inter Regular/203.pbf");

  it("extends WorkerError", () => {
    expect(error).toBeInstanceOf(Error);
  });

  it("has code GLYPH_NOT_FOUND", () => {
    expect(error.code).toBe(WorkerErrorCodes.GLYPH_NOT_FOUND);
  });

  it("has status 404", () => {
    expect(error.status).toBe(404);
  });

  it("includes the key in details", () => {
    expect(error.details).toEqual({ key: "Inter Regular/203.pbf" });
  });

  it("includes the key in the message", () => {
    expect(error.message).toContain("Inter Regular/203.pbf");
  });

  it("has no param", () => {
    expect(error.param).toBeUndefined();
  });
});
