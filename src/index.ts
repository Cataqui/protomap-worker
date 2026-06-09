import { PMTiles } from "pmtiles";
import type { AuthResult } from "./auth/auth.types";
import { AUTH_VERSIONS } from "./auth/auth-versions";
import { nativeDecompress, PMTILES_CACHE } from "./pmtiles/pmtiles-cache";
import { servePmtilesRequest } from "./pmtiles/tile-serving";
import { MapTileUtils } from "./shared/map-tile.utils";
import { KeyNotFoundError, R2Source } from "./storage/r2-source";
import type { Env } from "./types/env.type";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method.toUpperCase() === "POST") return new Response(undefined, { status: 405 });

    const url = new URL(request.url);
    const { ok, name, tile, ext } = MapTileUtils.tilePath(url.pathname);

    if (!ok) return new Response("Invalid URL", { status: 404 });

    if (env.AUTH_SECRET) {
      const result = await _authenticateTileRequest(url, env.AUTH_SECRET);
      if (!result.ok) return _buildAuthErrorResponse(result);
    }

    const cacheUrl = new URL(request.url);
    for (const handler of Object.values(AUTH_VERSIONS)) handler.stripParamsFromUrl(cacheUrl);

    const allowedOrigin = typeof env.ALLOWED_ORIGINS !== "undefined" ? _resolveAllowedOrigin(env.ALLOWED_ORIGINS, request.headers.get("Origin")) : "";

    const cache = caches.default;
    const cached = await cache.match(cacheUrl.href);

    if (cached) return _getCachedResponse(cached, allowedOrigin);

    const source = new R2Source(env, name);
    const pmtiles = new PMTiles(source, PMTILES_CACHE, nativeDecompress);

    try {
      const result = await servePmtilesRequest(pmtiles, name, tile, ext, env.PUBLIC_HOSTNAME || url.hostname);
      const headers = new Headers();
      if (result.contentType) headers.set("Content-Type", result.contentType);

      return _createCacheableResponse(ctx, cache, cacheUrl.href, allowedOrigin, env.CACHE_CONTROL, result.body, headers, result.status);
    } catch (e) {
      if (e instanceof KeyNotFoundError) {
        return _createCacheableResponse(ctx, cache, cacheUrl.href, allowedOrigin, env.CACHE_CONTROL, "Archive not found", new Headers(), 404);
      }

      throw e;
    }
  },
};

async function _authenticateTileRequest(url: URL, secret: string): Promise<AuthResult> {
  const v = url.searchParams.get("v");

  if (!v) return { ok: false, status: 401, message: "Unauthorized" };

  const handler = AUTH_VERSIONS[v];
  if (!handler) return { ok: false, status: 401, message: "Unauthorized" };

  for (const param of handler.requiredParams()) {
    if (!url.searchParams.has(param)) return { ok: false, status: 401, message: "Unauthorized" };
  }

  return handler.authenticate(url, secret);
}

function _resolveAllowedOrigin(allowedOrigins: string, requestOrigin: string | null): string {
  for (const o of allowedOrigins.split(",")) {
    if (o === requestOrigin || o === "*") return o;
  }
  return "";
}

async function _createCacheableResponse(
  ctx: ExecutionContext,
  cache: Cache,
  cacheKey: string,
  allowedOrigin: string,
  cacheControl: string | undefined,
  body: ArrayBuffer | string | undefined,
  headers: Headers,
  status: number,
): Promise<Response> {
  headers.set("Cache-Control", cacheControl || "public, max-age=86400");

  const cacheable = new Response(body, { headers, status });
  ctx.waitUntil(cache.put(cacheKey, cacheable));

  const responseHeaders = new Headers(headers);
  if (allowedOrigin) responseHeaders.set("Access-Control-Allow-Origin", allowedOrigin);
  responseHeaders.set("Vary", "Origin");

  return new Response(body, { headers: responseHeaders, status });
}

function _getCachedResponse(cached: Response, allowedOrigin: string): Response {
  const headers = new Headers(cached.headers);
  if (allowedOrigin) headers.set("Access-Control-Allow-Origin", allowedOrigin);
  headers.set("Vary", "Origin");
  return new Response(cached.body, { headers, status: cached.status });
}

function _buildAuthErrorResponse(result: AuthResult & { ok: false }): Response {
  return new Response(result.message, {
    status: result.status,
    headers: { "Content-Type": "text/plain" },
  });
}
