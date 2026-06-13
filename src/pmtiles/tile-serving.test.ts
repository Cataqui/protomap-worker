import type { Header, PMTiles, TileType } from "pmtiles";
import { describe, expect, it } from "vitest";
import { WorkerErrorCodes } from "../error";
import { servePmtilesRequest } from "./tile-serving";

function createMockPmtiles(overrides: {
  tileType?: TileType;
  minZoom?: number;
  maxZoom?: number;
  tileData?: ArrayBuffer | undefined;
  tileJson?: Record<string, unknown>;
}): PMTiles {
  const header = {
    specVersion: 3,
    rootDirectoryOffset: 0,
    rootDirectoryLength: 0,
    jsonMetadataOffset: 0,
    jsonMetadataLength: 0,
    leafDirectoryOffset: 0,
    tileDataOffset: 0,
    numAddressedTiles: 0,
    numTileEntries: 0,
    numTileContents: 0,
    clustered: false,
    internalCompression: 1,
    tileCompression: 1,
    tileType: overrides.tileType ?? (1 as TileType),
    minZoom: overrides.minZoom ?? 0,
    maxZoom: overrides.maxZoom ?? 10,
    minLon: -180,
    minLat: -90,
    maxLon: 180,
    maxLat: 90,
    centerZoom: 0,
    centerLon: 0,
    centerLat: 0,
  } as Header;

  return {
    getHeader: async () => header,
    getZxy: async (_z: number, _x: number, _y: number) => {
      const data = overrides.tileData;
      if (data === undefined) return undefined;
      return { data, etag: "test-etag", cacheControl: "public", expires: "never" };
    },
    getTileJson: async (_baseTilesUrl: string) => overrides.tileJson ?? {},
  } as unknown as PMTiles;
}

describe("servePmtilesRequest", () => {
  describe("TileJSON requests (no tile coordinates)", () => {
    it("returns 200 with application/json for a tile request without coordinates", async () => {
      const pmtiles = createMockPmtiles({ tileJson: { name: "test", format: "pbf" } });
      const result = await servePmtilesRequest(pmtiles, "testmap", undefined, "json", "https://example.com/regions");

      expect(result.status).toBe(200);
      expect(result.contentType).toBe("application/json");
      expect(typeof result.body).toBe("string");

      const parsed = JSON.parse(result.body as string);
      expect(parsed.name).toBe("test");
    });
  });

  describe("zoom validation", () => {
    it("throws TILE_ZOOM_OUT_OF_RANGE when zoom is below minZoom", async () => {
      const pmtiles = createMockPmtiles({ minZoom: 5, maxZoom: 10 });
      await expect(servePmtilesRequest(pmtiles, "test", [0, 0, 0] as [number, number, number], "mvt", "https://example.com/regions")).rejects.toMatchObject({
        code: WorkerErrorCodes.TILE_ZOOM_OUT_OF_RANGE,
        status: 400,
        details: { requested: 0, min: 5, max: 10 },
      });
    });

    it("throws TILE_ZOOM_OUT_OF_RANGE when zoom is above maxZoom", async () => {
      const pmtiles = createMockPmtiles({ minZoom: 0, maxZoom: 5 });
      await expect(servePmtilesRequest(pmtiles, "test", [10, 0, 0] as [number, number, number], "mvt", "https://example.com/regions")).rejects.toMatchObject({
        code: WorkerErrorCodes.TILE_ZOOM_OUT_OF_RANGE,
        status: 400,
      });
    });
  });

  describe("tile type validation", () => {
    it("throws TILE_TYPE_MISMATCH when tile extension does not match archive type", async () => {
      const pmtiles = createMockPmtiles({ tileType: 2 as TileType, minZoom: 0, maxZoom: 10 });
      await expect(servePmtilesRequest(pmtiles, "test", [0, 0, 0] as [number, number, number], "mvt", "https://example.com/regions")).rejects.toMatchObject({
        code: WorkerErrorCodes.TILE_TYPE_MISMATCH,
        status: 400,
      });
    });

    it("passes validation when tile extension matches archive type", async () => {
      const pmtiles = createMockPmtiles({ tileType: 1 as TileType, minZoom: 0, maxZoom: 10, tileData: new ArrayBuffer(4) });
      const result = await servePmtilesRequest(pmtiles, "test", [0, 0, 0] as [number, number, number], "mvt", "https://example.com/regions");

      expect(result.status).toBe(200);
    });
  });

  describe("successful tile serving", () => {
    it("returns 200 with tile data and correct content type for Mvt", async () => {
      const data = new ArrayBuffer(16);
      const pmtiles = createMockPmtiles({ tileType: 1 as TileType, minZoom: 0, maxZoom: 10, tileData: data });
      const result = await servePmtilesRequest(pmtiles, "test", [1, 2, 3] as [number, number, number], "mvt", "https://example.com/regions");

      expect(result.status).toBe(200);
      expect(result.body).toBe(data);
      expect(result.contentType).toBe("application/x-protobuf");
    });

    it("returns 200 with correct content type for Png", async () => {
      const data = new ArrayBuffer(16);
      const pmtiles = createMockPmtiles({ tileType: 2 as TileType, minZoom: 0, maxZoom: 10, tileData: data });
      const result = await servePmtilesRequest(pmtiles, "test", [1, 2, 3] as [number, number, number], "png", "https://example.com/regions");

      expect(result.status).toBe(200);
      expect(result.contentType).toBe("image/png");
    });

    it("returns 200 with correct content type for Jpeg", async () => {
      const data = new ArrayBuffer(16);
      const pmtiles = createMockPmtiles({ tileType: 3 as TileType, minZoom: 0, maxZoom: 10, tileData: data });
      const result = await servePmtilesRequest(pmtiles, "test", [1, 2, 3] as [number, number, number], "jpg", "https://example.com/regions");

      expect(result.status).toBe(200);
      expect(result.contentType).toBe("image/jpeg");
    });

    it("returns 200 with correct content type for Webp", async () => {
      const data = new ArrayBuffer(16);
      const pmtiles = createMockPmtiles({ tileType: 4 as TileType, minZoom: 0, maxZoom: 10, tileData: data });
      const result = await servePmtilesRequest(pmtiles, "test", [1, 2, 3] as [number, number, number], "webp", "https://example.com/regions");

      expect(result.status).toBe(200);
      expect(result.contentType).toBe("image/webp");
    });
  });

  describe("empty tiles", () => {
    it("returns 204 with content type when tile data is empty", async () => {
      const pmtiles = createMockPmtiles({ tileType: 1 as TileType, minZoom: 0, maxZoom: 10, tileData: undefined });
      const result = await servePmtilesRequest(pmtiles, "test", [1, 2, 3] as [number, number, number], "mvt", "https://example.com/regions");

      expect(result.status).toBe(204);
      expect(result.body).toBeUndefined();
      expect(result.contentType).toBe("application/x-protobuf");
    });
  });
});
