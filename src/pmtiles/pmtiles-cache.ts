import { Compression, ResolvedValueCache } from "pmtiles";

async function _nativeDecompress(buf: ArrayBuffer, compression: Compression): Promise<ArrayBuffer> {
  if (compression === Compression.None || compression === Compression.Unknown) return buf;

  if (compression === Compression.Gzip) {
    const stream = new Response(buf).body;
    const result = stream?.pipeThrough(new DecompressionStream("gzip"));
    return new Response(result).arrayBuffer();
  }

  throw new Error("Compression method not supported");
}

export const PMTILES_CACHE = new ResolvedValueCache(25, undefined, _nativeDecompress);
export { _nativeDecompress as nativeDecompress };
