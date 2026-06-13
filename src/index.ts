import { PMTiles } from "pmtiles";
import { AUTH_VERSIONS } from "./auth/auth-versions";
import { AuthParamMissingError, AuthVersionMissingError, AuthVersionUnknownError, MethodNotAllowedError, RouteNotFoundError, WorkerError } from "./error";
import { serveGlyphRequest } from "./glyphs/glyph-serving";
import { nativeDecompress, PMTILES_CACHE } from "./pmtiles/pmtiles-cache";
import { servePmtilesRequest } from "./pmtiles/tile-serving";
import { parseRoute } from "./router/router";
import { R2Source } from "./storage/r2-source";
import type { Env } from "./types/env.type";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const allowedOrigin = typeof env.ALLOWED_ORIGINS !== "undefined" ? _resolveAllowedOrigin(env.ALLOWED_ORIGINS, request.headers.get("Origin")) : "";

    try {
      if (request.method.toUpperCase() !== "GET") throw new MethodNotAllowedError(request.method);

      const url = new URL(request.url);
      const route = parseRoute(url.pathname);

      if (!route.ok) throw new RouteNotFoundError(url.pathname);

      if (env.AUTH_SECRET) await _authenticateRequest(url, env.AUTH_SECRET);

      const cacheUrl = new URL(request.url);
      cacheUrl.searchParams.delete("v");
      for (const handler of Object.values(AUTH_VERSIONS)) handler.stripParamsFromUrl(cacheUrl);

      const cache = caches.default;
      const cached = await cache.match(cacheUrl.href);

      if (cached) return _getCachedResponse(cached, allowedOrigin);

      if (route.type === "regions") {
        const source = new R2Source(env.BUCKET, `regions/${route.name}.pmtiles`);
        const pmtiles = new PMTiles(source, PMTILES_CACHE, nativeDecompress);
        const baseUrl = `https://${env.PUBLIC_HOSTNAME || url.hostname}/regions`;

        const result = await servePmtilesRequest(pmtiles, route.name, route.tile, route.ext, baseUrl);
        const headers = new Headers();
        if (result.contentType) headers.set("Content-Type", result.contentType);

        return _createCacheableResponse(ctx, cache, cacheUrl.href, allowedOrigin, env.CACHE_CONTROL, result.body, headers, result.status);
      }

      if (route.type === "glyphs") {
        const result = await serveGlyphRequest(env.BUCKET, route.key);
        const headers = new Headers();
        headers.set("Content-Type", result.contentType);

        return _createCacheableResponse(ctx, cache, cacheUrl.href, allowedOrigin, "public, max-age=31536000, immutable", result.body ?? undefined, headers, result.status);
      }

      throw new RouteNotFoundError(url.pathname);
    } catch (e) {
      if (e instanceof WorkerError) {
        const response = e.toResponse();

        if (allowedOrigin) response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
        response.headers.set("Vary", "Origin");
        return response;
      }
      throw e;
    }
  },
};

async function _authenticateRequest(url: URL, secret: string): Promise<void> {
  const v = url.searchParams.get("v");

  if (!v) throw new AuthVersionMissingError(Object.keys(AUTH_VERSIONS));

  const handler = AUTH_VERSIONS[v];
  if (!handler) throw new AuthVersionUnknownError(v, Object.keys(AUTH_VERSIONS));

  for (const param of handler.requiredParams()) if (!url.searchParams.has(param)) throw new AuthParamMissingError(param);

  await handler.authenticate(url, secret);
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
  headers.set("Cache-Control", cacheControl || "public, max-age=604800, stale-while-revalidate=86400");

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
