import { describe, expect, it } from "vitest";
import { WorkerErrorCodes } from "../error";
import { parseRoute } from "./router";

describe("parseRoute", () => {
  describe("regions routes", () => {
    it("parses a valid tile URL", () => {
      const result = parseRoute("/regions/brazil/12/1516/2021.mvt");
      expect(result).toEqual({
        ok: true,
        type: "regions",
        name: "brazil",
        tile: [12, 1516, 2021],
        ext: "mvt",
      });
    });

    it("parses a valid TileJSON URL", () => {
      const result = parseRoute("/regions/brazil.json");
      expect(result).toEqual({
        ok: true,
        type: "regions",
        name: "brazil",
        ext: "json",
      });
      if (result.ok && result.type === "regions") expect(result.tile).toBeUndefined();
    });

    it("parses a name with hyphens and underscores", () => {
      const result = parseRoute("/regions/my_map-v2/0/0/0.png");
      expect(result).toMatchObject({ ok: true, type: "regions", name: "my_map-v2" });
    });

    it("returns ok false for /regions/ without a name", () => {
      const result = parseRoute("/regions/");
      expect(result).toEqual({ ok: false });
    });

    it("returns ok false for /regions/ with invalid tile format", () => {
      const result = parseRoute("/regions/brazil/invalid");
      expect(result).toEqual({ ok: false });
    });
  });

  describe("glyphs routes", () => {
    it("parses a valid glyph path with spaces", () => {
      const result = parseRoute("/glyphs/Inter Regular/203.pbf");
      expect(result).toEqual({
        ok: true,
        type: "glyphs",
        key: "Inter Regular/203.pbf",
      });
    });

    it("parses a glyph path with multiple segments", () => {
      const result = parseRoute("/glyphs/Open Sans/0-255.pbf");
      expect(result).toEqual({
        ok: true,
        type: "glyphs",
        key: "Open Sans/0-255.pbf",
      });
    });

    it("parses a simple glyph path without directory", () => {
      const result = parseRoute("/glyphs/font.pbf");
      expect(result).toEqual({
        ok: true,
        type: "glyphs",
        key: "font.pbf",
      });
    });

    it("rejects path traversal with ..", () => {
      expect(() => parseRoute("/glyphs/../etc/passwd.pbf")).toThrow();
      try {
        parseRoute("/glyphs/../etc/passwd.pbf");
      } catch (e) {
        expect(e).toMatchObject({ code: WorkerErrorCodes.GLYPH_PATH_INVALID, status: 400 });
      }
    });

    it("rejects null bytes in path", () => {
      expect(() => parseRoute("/glyphs/\0.pbf")).toThrow();
      try {
        parseRoute("/glyphs/\0.pbf");
      } catch (e) {
        expect(e).toMatchObject({ code: WorkerErrorCodes.GLYPH_PATH_INVALID, status: 400 });
      }
    });

    it("rejects paths not ending in .pbf", () => {
      expect(() => parseRoute("/glyphs/font.txt")).toThrow();
      try {
        parseRoute("/glyphs/font.txt");
      } catch (e) {
        expect(e).toMatchObject({ code: WorkerErrorCodes.GLYPH_PATH_INVALID, status: 400 });
      }
    });

    it("returns ok false for /glyphs/ without a path", () => {
      const result = parseRoute("/glyphs/");
      expect(result).toEqual({ ok: false });
    });
  });

  describe("invalid routes", () => {
    it("returns ok false for old-style paths without prefix", () => {
      expect(parseRoute("/brazil/12/1516/2021.mvt")).toEqual({ ok: false });
    });

    it("returns ok false for random paths", () => {
      expect(parseRoute("/invalid")).toEqual({ ok: false });
    });

    it("returns ok false for root path", () => {
      expect(parseRoute("/")).toEqual({ ok: false });
    });
  });
});
