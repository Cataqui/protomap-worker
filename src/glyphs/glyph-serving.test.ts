import { describe, expect, it } from "vitest";
import { WorkerErrorCodes } from "../error";
import { serveGlyphRequest } from "./glyph-serving";

function createMockBucket(getResult: R2ObjectBody | null | undefined): R2Bucket {
  return {
    get: async () => getResult as R2ObjectBody | null,
  } as unknown as R2Bucket;
}

function createMockObject(data: ArrayBuffer): R2ObjectBody {
  return {
    arrayBuffer: async () => data,
    httpMetadata: { contentType: "application/x-protobuf" },
  } as unknown as R2ObjectBody;
}

describe("serveGlyphRequest", () => {
  it("returns 200 with glyph data when found", async () => {
    const data = new ArrayBuffer(16);
    const bucket = createMockBucket(createMockObject(data));
    const result = await serveGlyphRequest(bucket, "Inter Regular/203.pbf");

    expect(result.status).toBe(200);
    expect(result.contentType).toBe("application/x-protobuf");
    expect(result.body).toBe(data);
  });

  it("throws GlyphNotFoundError when glyph is missing", async () => {
    const bucket = createMockBucket(null);

    try {
      await serveGlyphRequest(bucket, "Missing Font/0.pbf");
    } catch (e) {
      expect(e).toMatchObject({
        code: WorkerErrorCodes.GLYPH_NOT_FOUND,
        status: 404,
      });
      expect((e as any).details).toEqual({ key: "Missing Font/0.pbf" });
    }
  });

  it("uses glyph R2 key with prefix", async () => {
    const data = new ArrayBuffer(8);
    let capturedKey = "";
    const bucket = {
      get: async (key: string) => {
        capturedKey = key;
        return createMockObject(data);
      },
    } as unknown as R2Bucket;

    await serveGlyphRequest(bucket, "Inter Regular/203.pbf");
    expect(capturedKey).toBe("glyphs/Inter Regular/203.pbf");
  });
});
