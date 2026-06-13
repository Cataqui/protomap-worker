import { GlyphNotFoundError } from "../error";

const GLYPH_CONTENT_TYPE = "application/x-protobuf";

export async function serveGlyphRequest(bucket: R2Bucket, key: string): Promise<{ body: ArrayBuffer | null; status: number; contentType: string }> {
  const r2Key = `glyphs/${key}`;
  const object = await bucket.get(r2Key);

  if (!object) throw new GlyphNotFoundError(key);

  return {
    body: await object.arrayBuffer(),
    status: 200,
    contentType: GLYPH_CONTENT_TYPE,
  };
}
