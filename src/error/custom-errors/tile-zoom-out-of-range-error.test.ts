import { describe, expect, it } from "vitest";
import { WorkerErrorCodes } from "../error-codes";
import { TileZoomOutOfRangeError } from "./tile-zoom-out-of-range-error";

describe("TileZoomOutOfRangeError", () => {
  const error = new TileZoomOutOfRangeError(15, 0, 10);

  it("extends WorkerError", () => {
    expect(error).toBeInstanceOf(Error);
  });

  it("has code TILE_ZOOM_OUT_OF_RANGE", () => {
    expect(error.code).toBe(WorkerErrorCodes.TILE_ZOOM_OUT_OF_RANGE);
  });

  it("has status 400", () => {
    expect(error.status).toBe(400);
  });

  it("has no param", () => {
    expect(error.param).toBeUndefined();
  });

  it("includes zoom details in details", () => {
    expect(error.details).toEqual({ requested: 15, min: 0, max: 10 });
  });

  it("includes zoom values in the message", () => {
    expect(error.message).toContain("15");
    expect(error.message).toContain("0");
    expect(error.message).toContain("10");
  });
});
