import { Compression, EtagMismatch, PMTiles, type RangeResponse, ResolvedValueCache, type Source, TileType, tileTypeExt } from "pmtiles";
import type { AuthResult } from "./auth/auth.types";
import { AUTH_VERSIONS } from "./auth/auth-versions";
import { MapTileUtils } from "./shared/map-tile.utils";

interface Env {
  // biome-ignore lint: config name
  ALLOWED_ORIGINS?: string;
  // biome-ignore lint: config name
  AUTH_SECRET?: string;
  // biome-ignore lint: config name
  BUCKET: R2Bucket;
  // biome-ignore lint: config name
  CACHE_CONTROL?: string;
  // biome-ignore lint: config name
  PMTILES_PATH?: string;
  // biome-ignore lint: config name
  PUBLIC_HOSTNAME?: string;
}

class KeyNotFoundError extends Error {}

async function nativeDecompress(buf: ArrayBuffer, compression: Compression): Promise<ArrayBuffer> {
  if (compression === Compression.None || compression === Compression.Unknown) return buf;

  if (compression === Compression.Gzip) {
    const stream = new Response(buf).body;
    const result = stream?.pipeThrough(new DecompressionStream("gzip"));
    return new Response(result).arrayBuffer();
  }

  throw new Error("Compression method not supported");
}

const CACHE = new ResolvedValueCache(25, undefined, nativeDecompress);

class R2Source implements Source {
  env: Env;
  archiveName: string;

  constructor(env: Env, archiveName: string) {
    this.env = env;
    this.archiveName = archiveName;
  }

  getKey() {
    return this.archiveName;
  }

  async getBytes(offset: number, length: number, _signal?: AbortSignal, etag?: string): Promise<RangeResponse> {
    const resp = await this.env.BUCKET.get(MapTileUtils.pmtilesPath(this.archiveName, this.env.PMTILES_PATH), {
      range: { offset: offset, length: length },
      onlyIf: { etagMatches: etag },
    });

    if (!resp) throw new KeyNotFoundError("Archive not found");

    const o = resp as R2ObjectBody;

    if (!o.body) throw new EtagMismatch();

    const a = await o.arrayBuffer();
    return {
      data: a,
      etag: o.etag,
      cacheControl: o.httpMetadata?.cacheControl,
      expires: o.httpMetadata?.cacheExpiry?.toISOString(),
    };
  }
}

async function _authenticate(url: URL, secret: string): Promise<AuthResult> {
  const v = url.searchParams.get("v");

  if (!v) return { ok: false, status: 401, message: "Unauthorized" };

  const handler = AUTH_VERSIONS[v];
  if (!handler) return { ok: false, status: 401, message: "Unauthorized" };

  for (const param of handler.requiredParams()) {
    if (!url.searchParams.has(param)) return { ok: false, status: 401, message: "Unauthorized" };
  }

  return handler.authenticate(url, secret);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method.toUpperCase() === "POST") return new Response(undefined, { status: 405 });

    const url = new URL(request.url);
    const { ok, name, tile, ext } = MapTileUtils.tilePath(url.pathname);

    const cache = caches.default;

    if (!ok) return new Response("Invalid URL", { status: 404 });

    if (env.AUTH_SECRET) {
      const result = await _authenticate(url, env.AUTH_SECRET);
      if (!result.ok) {
        return new Response(result.message, {
          status: result.status,
          headers: { "Content-Type": "text/plain" },
        });
      }
    }

    const cacheUrl = new URL(request.url);
    for (const handler of Object.values(AUTH_VERSIONS)) handler.stripParamsFromUrl(cacheUrl);

    const cacheKey = cacheUrl.href;

    let allowedOrigin = "";
    if (typeof env.ALLOWED_ORIGINS !== "undefined") {
      for (const o of env.ALLOWED_ORIGINS.split(",")) {
        if (o === request.headers.get("Origin") || o === "*") {
          allowedOrigin = o;
        }
      }
    }

    const cached = await cache.match(cacheKey);

    if (cached) {
      const respHeaders = new Headers(cached.headers);
      if (allowedOrigin) respHeaders.set("Access-Control-Allow-Origin", allowedOrigin);
      respHeaders.set("Vary", "Origin");

      return new Response(cached.body, {
        headers: respHeaders,
        status: cached.status,
      });
    }

    const cacheableResponse = (body: ArrayBuffer | string | undefined, cacheableHeaders: Headers, status: number) => {
      cacheableHeaders.set("Cache-Control", env.CACHE_CONTROL || "public, max-age=86400");

      const cacheable = new Response(body, {
        headers: cacheableHeaders,
        status: status,
      });

      ctx.waitUntil(cache.put(cacheKey, cacheable));

      const respHeaders = new Headers(cacheableHeaders);
      if (allowedOrigin) respHeaders.set("Access-Control-Allow-Origin", allowedOrigin);
      respHeaders.set("Vary", "Origin");
      return new Response(body, { headers: respHeaders, status: status });
    };

    const cacheableHeaders = new Headers();
    const source = new R2Source(env, name);
    const p = new PMTiles(source, CACHE, nativeDecompress);
    try {
      const pHeader = await p.getHeader();

      if (!tile) {
        cacheableHeaders.set("Content-Type", "application/json");
        const t = await p.getTileJson(`https://${env.PUBLIC_HOSTNAME || url.hostname}/${name}`);
        return cacheableResponse(JSON.stringify(t), cacheableHeaders, 200);
      }

      if (tile[0] < pHeader.minZoom || tile[0] > pHeader.maxZoom) {
        return cacheableResponse(undefined, cacheableHeaders, 404);
      }

      const extToType: Record<string, TileType> = {
        mvt: TileType.Mvt,
        pbf: TileType.Mvt, // allow this for now. Eventually we will delete this in favor of .mvt
        png: TileType.Png,
        jpg: TileType.Jpeg,
        webp: TileType.Webp,
        avif: TileType.Avif,
      };

      const expectedType = extToType[ext];

      if (pHeader.tileType !== expectedType && tileTypeExt(pHeader.tileType) !== "") {
        return cacheableResponse(`Bad request: requested .${ext} but archive has type ${tileTypeExt(pHeader.tileType)}`, cacheableHeaders, 400);
      }

      const tiledata = await p.getZxy(tile[0], tile[1], tile[2]);

      switch (pHeader.tileType) {
        case TileType.Mvt:
          cacheableHeaders.set("Content-Type", "application/x-protobuf");
          break;
        case TileType.Png:
          cacheableHeaders.set("Content-Type", "image/png");
          break;
        case TileType.Jpeg:
          cacheableHeaders.set("Content-Type", "image/jpeg");
          break;
        case TileType.Webp:
          cacheableHeaders.set("Content-Type", "image/webp");
          break;
      }

      if (tiledata) {
        return cacheableResponse(tiledata.data, cacheableHeaders, 200);
      }

      return cacheableResponse(undefined, cacheableHeaders, 204);
    } catch (e) {
      if (e instanceof KeyNotFoundError) {
        return cacheableResponse("Archive not found", cacheableHeaders, 404);
      }
      throw e;
    }
  },
};
