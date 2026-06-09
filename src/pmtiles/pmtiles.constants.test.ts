import { TileType } from "pmtiles";
import { describe, expect, it } from "vitest";
import { EXT_TO_TILE_TYPE, TILE_TYPE_TO_CONTENT_TYPE, tileTypeExt } from "./pmtiles.constants";

describe("EXT_TO_TILE_TYPE", () => {
  it("maps mvt to TileType.Mvt", () => {
    expect(EXT_TO_TILE_TYPE.mvt).toBe(TileType.Mvt);
  });

  it("maps pbf to TileType.Mvt", () => {
    expect(EXT_TO_TILE_TYPE.pbf).toBe(TileType.Mvt);
  });

  it("maps png to TileType.Png", () => {
    expect(EXT_TO_TILE_TYPE.png).toBe(TileType.Png);
  });

  it("maps jpg to TileType.Jpeg", () => {
    expect(EXT_TO_TILE_TYPE.jpg).toBe(TileType.Jpeg);
  });

  it("maps webp to TileType.Webp", () => {
    expect(EXT_TO_TILE_TYPE.webp).toBe(TileType.Webp);
  });

  it("maps avif to TileType.Avif", () => {
    expect(EXT_TO_TILE_TYPE.avif).toBe(TileType.Avif);
  });

  it("returns undefined for unknown extension", () => {
    expect(EXT_TO_TILE_TYPE.unknown).toBeUndefined();
  });
});

describe("TILE_TYPE_TO_CONTENT_TYPE", () => {
  it("maps Mvt to application/x-protobuf", () => {
    expect(TILE_TYPE_TO_CONTENT_TYPE[TileType.Mvt]).toBe("application/x-protobuf");
  });

  it("maps Png to image/png", () => {
    expect(TILE_TYPE_TO_CONTENT_TYPE[TileType.Png]).toBe("image/png");
  });

  it("maps Jpeg to image/jpeg", () => {
    expect(TILE_TYPE_TO_CONTENT_TYPE[TileType.Jpeg]).toBe("image/jpeg");
  });

  it("maps Webp to image/webp", () => {
    expect(TILE_TYPE_TO_CONTENT_TYPE[TileType.Webp]).toBe("image/webp");
  });

  it("does not have an entry for Avif", () => {
    expect(TILE_TYPE_TO_CONTENT_TYPE[TileType.Avif]).toBeUndefined();
  });

  it("does not have an entry for Unknown", () => {
    expect(TILE_TYPE_TO_CONTENT_TYPE[TileType.Unknown]).toBeUndefined();
  });
});

describe("tileTypeExt re-export", () => {
  it("returns a string for Mvt", () => {
    expect(typeof tileTypeExt(TileType.Mvt)).toBe("string");
  });

  it("returns a string for Png", () => {
    expect(typeof tileTypeExt(TileType.Png)).toBe("string");
  });

  it("returns empty string for Unknown", () => {
    expect(tileTypeExt(TileType.Unknown)).toBe("");
  });
});
