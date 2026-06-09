import { describe, expect, it } from "vitest";
import { MapTileUtils } from "./map-tile.utils";

describe("pmtilesPath", () => {
  it("returns name with .pmtiles extension when no setting provided", () => {
    expect(MapTileUtils.pmtilesPath("foo")).toBe("foo.pmtiles");
  });

  it("replaces {name} placeholder in setting", () => {
    expect(MapTileUtils.pmtilesPath("foo", "folder/{name}/file.pmtiles")).toBe("folder/foo/file.pmtiles");
  });

  it("handles name with slash in template", () => {
    expect(MapTileUtils.pmtilesPath("foo/bar", "folder/{name}/file.pmtiles")).toBe("folder/foo/bar/file.pmtiles");
  });

  it("replaces multiple {name} occurrences", () => {
    expect(MapTileUtils.pmtilesPath("slug", "folder/{name}/{name}.pmtiles")).toBe("folder/slug/slug.pmtiles");
    expect(MapTileUtils.pmtilesPath("foo/bar", "folder/{name}/{name}.pmtiles")).toBe("folder/foo/bar/foo/bar.pmtiles");
  });
});

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
