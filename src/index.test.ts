/// <reference types="@cloudflare/vitest-pool-workers" />

import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import worker from "../src/index";
import { AuthUtils } from "./auth/auth.utils";
import { WorkerErrorCodes } from "./error";

const BASIC_ENV = {
  // biome-ignore lint/style/useNamingConvention: env binding names
  BUCKET: { get: async () => null } as unknown as R2Bucket,
};

describe("Worker fetch handler", () => {
  it("responds with 405 for POST requests", async () => {
    const request = new Request("http://example.com/regions/test", { method: "POST" });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, BASIC_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(405);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    const body = (await response.json()) as any;
    expect(body.code).toBe(WorkerErrorCodes.METHOD_NOT_ALLOWED);
  });

  it("responds with 404 for invalid paths", async () => {
    const request = new Request("http://example.com/invalid");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, BASIC_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(404);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    const body = (await response.json()) as any;
    expect(body.code).toBe(WorkerErrorCodes.ROUTE_NOT_FOUND);
  });

  it("responds with 404 for old-style paths without prefix", async () => {
    const request = new Request("http://example.com/mymap/1/2/3.mvt");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, BASIC_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(404);
    const body = (await response.json()) as any;
    expect(body.code).toBe(WorkerErrorCodes.ROUTE_NOT_FOUND);
  });

  it("responds with 404 for missing archives in regions", async () => {
    const request = new Request("http://example.com/regions/nonexistent/0/0/0.png");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, BASIC_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(404);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    const body = (await response.json()) as any;
    expect(body.code).toBe(WorkerErrorCodes.ARCHIVE_NOT_FOUND);
  });

  it("handles tile path with valid format but missing archive", async () => {
    const request = new Request("http://example.com/regions/mymap/1/2/3.mvt");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, BASIC_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(404);
    expect(response.headers.get("Content-Type")).toBe("application/json");
  });

  it("handles tileset JSON path with missing archive", async () => {
    const request = new Request("http://example.com/regions/mymap.json");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, BASIC_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(404);
    expect(response.headers.get("Content-Type")).toBe("application/json");
  });

  it("sets CORS headers for allowed origins", async () => {
    const request = new Request("http://example.com/regions/mymap.json");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, BASIC_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.headers.get("Vary")).toBe("Origin");
  });

  it("responds with 404 for path traversal (URL-normalized)", async () => {
    const request = new Request("http://example.com/glyphs/../../../etc/passwd.pbf");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, BASIC_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(404);
    const body = (await response.json()) as any;
    expect(body.code).toBe(WorkerErrorCodes.ROUTE_NOT_FOUND);
  });

  it("responds with 400 for glyph paths not ending in .pbf", async () => {
    const request = new Request("http://example.com/glyphs/font.txt");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, BASIC_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(400);
    const body = (await response.json()) as any;
    expect(body.code).toBe(WorkerErrorCodes.GLYPH_PATH_INVALID);
  });

  it("responds with 404 for missing glyphs", async () => {
    const request = new Request("http://example.com/glyphs/Missing Font/0.pbf");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, BASIC_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(404);
    const body = (await response.json()) as any;
    expect(body.code).toBe(WorkerErrorCodes.GLYPH_NOT_FOUND);
  });
});

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function createAuthUrl(path: string, expOffset: number, secret = "test-secret-key"): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + expOffset;
  const message = `v1:${exp}`;
  const sig = await AuthUtils.computeHmac(secret, message);
  return `http://example.com${path}?v=1&sig=${toHex(sig)}&exp=${exp}`;
}

const AUTH_ENV = {
  // biome-ignore lint/style/useNamingConvention: env binding names
  AUTH_SECRET: "test-secret-key",
  // biome-ignore lint/style/useNamingConvention: env binding names
  BUCKET: { get: async () => null } as unknown as R2Bucket,
};

describe("Worker authentication", () => {
  it("rejects request without v param — AUTH_VERSION_MISSING", async () => {
    const request = new Request("http://example.com/regions/mymap/0/0/0.png?sig=abc&exp=123");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, AUTH_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(401);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    const body = (await response.json()) as any;
    expect(body.code).toBe(WorkerErrorCodes.AUTH_VERSION_MISSING);
  });

  it("rejects request without sig param — AUTH_PARAM_MISSING", async () => {
    const request = new Request("http://example.com/regions/mymap/0/0/0.png?v=1&exp=123");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, AUTH_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(401);
    const body = (await response.json()) as any;
    expect(body.code).toBe(WorkerErrorCodes.AUTH_PARAM_MISSING);
    expect(body.param).toBe("sig");
  });

  it("rejects request without exp param — AUTH_PARAM_MISSING", async () => {
    const request = new Request("http://example.com/regions/mymap/0/0/0.png?v=1&sig=abc");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, AUTH_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(401);
    const body = (await response.json()) as any;
    expect(body.code).toBe(WorkerErrorCodes.AUTH_PARAM_MISSING);
  });

  it("rejects request without any auth params — AUTH_VERSION_MISSING", async () => {
    const request = new Request("http://example.com/regions/mymap/0/0/0.png");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, AUTH_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(401);
    const body = (await response.json()) as any;
    expect(body.code).toBe(WorkerErrorCodes.AUTH_VERSION_MISSING);
  });

  it("rejects request with unknown version v=2 — AUTH_VERSION_UNKNOWN", async () => {
    const request = new Request("http://example.com/regions/mymap/0/0/0.png?v=2&sig=abc&exp=9999999999");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, AUTH_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(401);
    const body = (await response.json()) as any;
    expect(body.code).toBe(WorkerErrorCodes.AUTH_VERSION_UNKNOWN);
    expect(body.provided).toBe("2");
  });

  it("rejects request with unknown version v=99 — AUTH_VERSION_UNKNOWN", async () => {
    const request = new Request("http://example.com/regions/mymap/0/0/0.png?v=99&sig=abc&exp=9999999999");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, AUTH_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(401);
    const body = (await response.json()) as any;
    expect(body.code).toBe(WorkerErrorCodes.AUTH_VERSION_UNKNOWN);
    expect(body.provided).toBe("99");
  });

  it("rejects request with non-hex sig — AUTH_SIG_INVALID_HEX", async () => {
    const request = new Request("http://example.com/regions/mymap/0/0/0.png?v=1&sig=nothex&exp=9999999999");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, AUTH_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(401);
    const body = (await response.json()) as any;
    expect(body.code).toBe(WorkerErrorCodes.AUTH_SIG_INVALID_HEX);
  });

  it("rejects request with non-numeric exp — AUTH_EXP_INVALID", async () => {
    const request = new Request("http://example.com/regions/mymap/0/0/0.png?v=1&sig=abc&exp=notanumber");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, AUTH_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(401);
    const body = (await response.json()) as any;
    expect(body.code).toBe(WorkerErrorCodes.AUTH_EXP_INVALID);
    expect(body.param).toBe("exp");
  });

  it("rejects request with negative exp — AUTH_EXP_INVALID", async () => {
    const request = new Request("http://example.com/regions/mymap/0/0/0.png?v=1&sig=abc&exp=-1");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, AUTH_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(401);
    const body = (await response.json()) as any;
    expect(body.code).toBe(WorkerErrorCodes.AUTH_EXP_INVALID);
  });

  it("rejects request with floating-point exp — AUTH_EXP_INVALID", async () => {
    const request = new Request("http://example.com/regions/mymap/0/0/0.png?v=1&sig=abc&exp=123.456");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, AUTH_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(401);
    const body = (await response.json()) as any;
    expect(body.code).toBe(WorkerErrorCodes.AUTH_EXP_INVALID);
  });

  it("rejects expired request — AUTH_EXPIRED", async () => {
    const url = await createAuthUrl("/regions/mymap/0/0/0.png", -3600);
    const request = new Request(url);
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, AUTH_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(403);
    const body = (await response.json()) as any;
    expect(body.code).toBe(WorkerErrorCodes.AUTH_EXPIRED);
    expect(body.param).toBe("exp");
  });

  it("rejects expired request with exp 1 second in past — AUTH_EXPIRED", async () => {
    const url = await createAuthUrl("/regions/mymap/0/0/0.png", -1);
    const request = new Request(url);
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, AUTH_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(403);
    const body = (await response.json()) as any;
    expect(body.code).toBe(WorkerErrorCodes.AUTH_EXPIRED);
  });

  it("rejects request with invalid signature — AUTH_SIG_INVALID_HEX", async () => {
    const request = new Request("http://example.com/regions/mymap/0/0/0.png?v=1&sig=invalidsignature&exp=9999999999");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, AUTH_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(401);
    const body = (await response.json()) as any;
    expect(body.code).toBe(WorkerErrorCodes.AUTH_SIG_INVALID_HEX);
  });

  it("rejects request with wrong secret — AUTH_SIG_MISMATCH", async () => {
    const url = await createAuthUrl("/regions/mymap/0/0/0.png", 3600);
    const request = new Request(url);
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, { ...AUTH_ENV, AUTH_SECRET: "wrong-secret" }, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(401);
    const body = (await response.json()) as any;
    expect(body.code).toBe(WorkerErrorCodes.AUTH_SIG_MISMATCH);
  });

  it("rejects request when exp is tampered after signing — AUTH_SIG_MISMATCH", async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const message = `v1:${exp}`;
    const sig = await AuthUtils.computeHmac("test-secret-key", message);
    const url = new URL(`http://example.com/regions/mymap/0/0/0.png?v=1&sig=${toHex(sig)}&exp=${exp + 1}`);
    const request = new Request(url);
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, AUTH_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(401);
    const body = (await response.json()) as any;
    expect(body.code).toBe(WorkerErrorCodes.AUTH_SIG_MISMATCH);
  });

  it("rejects odd-length hex sig — AUTH_SIG_INVALID_HEX", async () => {
    const request = new Request("http://example.com/regions/mymap/0/0/0.png?v=1&sig=abc&exp=9999999999");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, AUTH_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(401);
    const body = (await response.json()) as any;
    expect(body.code).toBe(WorkerErrorCodes.AUTH_SIG_INVALID_HEX);
  });

  it("rejects sig with invalid hex characters — AUTH_SIG_INVALID_HEX", async () => {
    const url = new URL("http://example.com/regions/mymap/0/0/0.png?v=1&sig=zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz&exp=9999999999");
    const request = new Request(url);
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, AUTH_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(401);
    const body = (await response.json()) as any;
    expect(body.code).toBe(WorkerErrorCodes.AUTH_SIG_INVALID_HEX);
  });

  it("passes request with valid signature for regions endpoint", async () => {
    const url = await createAuthUrl("/regions/mymap/0/0/0.png", 3600);
    const request = new Request(url);
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, AUTH_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(404);
  });

  it("passes request with valid signature and far future expiration", async () => {
    const url = await createAuthUrl("/regions/mymap/0/0/0.png", 86400 * 30);
    const request = new Request(url);
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, AUTH_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(404);
  });

  it("passes request with extra unknown query params", async () => {
    const url = await createAuthUrl("/regions/mymap/0/0/0.png", 3600);
    const request = new Request(url + "&foo=bar");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, AUTH_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(404);
  });

  it("passes request with exp at exact current second", async () => {
    const url = await createAuthUrl("/regions/mymap/0/0/0.png", 0);
    const request = new Request(url);
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, AUTH_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(404);
  });

  it("returns Content-Type application/json for auth errors", async () => {
    const request = new Request("http://example.com/regions/mymap/0/0/0.png");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, AUTH_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.headers.get("Content-Type")).toBe("application/json");
  });

  it("requires auth for glyphs endpoint", async () => {
    const request = new Request("http://example.com/glyphs/Inter Regular/203.pbf");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, AUTH_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(401);
    const body = (await response.json()) as any;
    expect(body.code).toBe(WorkerErrorCodes.AUTH_VERSION_MISSING);
  });

  it("passes valid auth for glyphs endpoint", async () => {
    const url = await createAuthUrl("/glyphs/Inter Regular/203.pbf", 3600);
    const request = new Request(url);
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, AUTH_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(404);
  });
});
