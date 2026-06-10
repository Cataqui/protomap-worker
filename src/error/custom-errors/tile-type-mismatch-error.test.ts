import { describe, expect, it } from "vitest";
import { WorkerErrorCodes } from "../error-codes";
import { TileTypeMismatchError } from "./tile-type-mismatch-error";

describe("TileTypeMismatchError", () => {
  const error = new TileTypeMismatchError("mvt", "png");

  it("extends WorkerError", () => {
    expect(error).toBeInstanceOf(Error);
  });

  it("has code TILE_TYPE_MISMATCH", () => {
    expect(error.code).toBe(WorkerErrorCodes.TILE_TYPE_MISMATCH);
  });

  it("has status 400", () => {
    expect(error.status).toBe(400);
  });

  it("has no param", () => {
    expect(error.param).toBeUndefined();
  });

  it("includes requested and actual in details", () => {
    expect(error.details).toEqual({ requested: "mvt", actual: "png" });
  });

  it("includes extensions in the message", () => {
    expect(error.message).toContain("mvt");
    expect(error.message).toContain("png");
  });
});
