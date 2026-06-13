import { describe, expect, it } from "vitest";
import { MapTileUtils } from "./map-tile.utils";

describe("tilePath", () => {
  it("parses tile URL with coordinates", () => {
    const result = MapTileUtils.tilePath("/mymap/10/5/12.png");
    expect(result.ok).toBe(true);
    expect(result.name).toBe("mymap");
    expect(result.tile).toEqual([10, 5, 12]);
    expect(result.ext).toBe("png");
  });

  it("parses tileset JSON URL", () => {
    const result = MapTileUtils.tilePath("/mymap.json");
    expect(result.ok).toBe(true);
    expect(result.name).toBe("mymap");
    expect(result.ext).toBe("json");
  });

  it("returns invalid for malformed paths", () => {
    const result = MapTileUtils.tilePath("/invalid");
    expect(result.ok).toBe(false);
  });
});
