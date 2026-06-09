import { Compression } from "pmtiles";
import { describe, expect, it } from "vitest";
import { WorkerErrorCodes } from "../error";
import { nativeDecompress, PMTILES_CACHE } from "./pmtiles-cache";

describe("nativeDecompress", () => {
  it("returns the same buffer for Compression.None", async () => {
    const buf = new ArrayBuffer(8);
    const result = await nativeDecompress(buf, Compression.None);
    expect(result).toBe(buf);
  });

  it("returns the same buffer for Compression.Unknown", async () => {
    const buf = new ArrayBuffer(8);
    const result = await nativeDecompress(buf, Compression.Unknown);
    expect(result).toBe(buf);
  });

  it("throws COMPRESSION_NOT_SUPPORTED for Brotli compression", async () => {
    const buf = new ArrayBuffer(8);
    await expect(nativeDecompress(buf, Compression.Brotli)).rejects.toMatchObject({
      code: WorkerErrorCodes.COMPRESSION_NOT_SUPPORTED,
      status: 501,
    });
  });

  it("throws COMPRESSION_NOT_SUPPORTED for Zstd compression", async () => {
    const buf = new ArrayBuffer(8);
    await expect(nativeDecompress(buf, Compression.Zstd)).rejects.toMatchObject({
      code: WorkerErrorCodes.COMPRESSION_NOT_SUPPORTED,
      status: 501,
    });
  });
});

describe("PMTILES_CACHE", () => {
  it("is defined", () => {
    expect(PMTILES_CACHE).toBeDefined();
  });

  it("has a getHeader method", () => {
    expect(typeof PMTILES_CACHE.getHeader).toBe("function");
  });

  it("has a getDirectory method", () => {
    expect(typeof PMTILES_CACHE.getDirectory).toBe("function");
  });

  it("has a prune method", () => {
    expect(typeof PMTILES_CACHE.prune).toBe("function");
  });

  it("has an invalidate method", () => {
    expect(typeof PMTILES_CACHE.invalidate).toBe("function");
  });
});
