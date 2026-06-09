/// <reference types="@cloudflare/vitest-pool-workers" />

import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import worker from "../src/index";
import { AuthUtils } from "./auth/auth.utils";

const BASIC_ENV = {
  // biome-ignore lint/style/useNamingConvention: env binding names
  BUCKET: { get: async () => null } as unknown as R2Bucket,
};

describe("Worker fetch handler", () => {
  it("responds with 405 for POST requests", async () => {
    const request = new Request("http://example.com/test.pmtiles", { method: "POST" });
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, BASIC_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(405);
  });

  it("responds with 404 for invalid paths", async () => {
    const request = new Request("http://example.com/invalid");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, BASIC_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(404);
  });

  it("responds with 404 for missing archives", async () => {
    const request = new Request("http://example.com/nonexistent/0/0/0.png");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, BASIC_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(404);
  });

  it("handles tile path with valid format but missing archive", async () => {
    const request = new Request("http://example.com/mymap/1/2/3.mvt");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, BASIC_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(404);
  });

  it("handles tileset JSON path with missing archive", async () => {
    const request = new Request("http://example.com/mymap.json");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, BASIC_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(404);
  });

  it("sets CORS headers for allowed origins", async () => {
    const request = new Request("http://example.com/mymap.json");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, BASIC_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.headers.get("Vary")).toBe("Origin");
  });
});

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function createAuthUrl(expOffset: number): Promise<string> {
  const secret = "test-secret-key";
  const exp = Math.floor(Date.now() / 1000) + expOffset;
  const message = `v1:${exp}`;
  const sig = await AuthUtils.computeHmac(secret, message);
  return `http://example.com/mymap/0/0/0.png?v=1&sig=${toHex(sig)}&exp=${exp}`;
}

const AUTH_ENV = {
  // biome-ignore lint/style/useNamingConvention: env binding names
  AUTH_SECRET: "test-secret-key",
  // biome-ignore lint/style/useNamingConvention: env binding names
  BUCKET: { get: async () => null } as unknown as R2Bucket,
};

describe("Worker authentication", () => {
  it("rejects request without v param", async () => {
    const request = new Request("http://example.com/mymap/0/0/0.png?sig=abc&exp=123");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, AUTH_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(401);
    expect(await response.text()).toBe("Unauthorized");
  });

  it("rejects request without sig param", async () => {
    const request = new Request("http://example.com/mymap/0/0/0.png?v=1&exp=123");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, AUTH_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(401);
  });

  it("rejects request without exp param", async () => {
    const request = new Request("http://example.com/mymap/0/0/0.png?v=1&sig=abc");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, AUTH_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(401);
  });

  it("rejects request without any auth params", async () => {
    const request = new Request("http://example.com/mymap/0/0/0.png");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, AUTH_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(401);
  });

  it("rejects request with unknown version v=2", async () => {
    const request = new Request("http://example.com/mymap/0/0/0.png?v=2&sig=abc&exp=9999999999");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, AUTH_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(401);
  });

  it("rejects request with unknown version v=99", async () => {
    const request = new Request("http://example.com/mymap/0/0/0.png?v=99&sig=abc&exp=9999999999");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, AUTH_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(401);
  });

  it("rejects request with non-hex sig", async () => {
    const request = new Request("http://example.com/mymap/0/0/0.png?v=1&sig=nothex&exp=9999999999");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, AUTH_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(401);
  });

  it("rejects request with non-numeric exp", async () => {
    const request = new Request("http://example.com/mymap/0/0/0.png?v=1&sig=abc&exp=notanumber");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, AUTH_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(401);
  });

  it("rejects request with negative exp", async () => {
    const request = new Request("http://example.com/mymap/0/0/0.png?v=1&sig=abc&exp=-1");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, AUTH_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(401);
  });

  it("rejects request with floating-point exp", async () => {
    const request = new Request("http://example.com/mymap/0/0/0.png?v=1&sig=abc&exp=123.456");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, AUTH_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(401);
  });

  it("rejects expired request", async () => {
    const url = await createAuthUrl(-3600);
    const request = new Request(url);
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, AUTH_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(403);
  });

  it("rejects expired request with exp 1 second in past", async () => {
    const url = await createAuthUrl(-1);
    const request = new Request(url);
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, AUTH_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(403);
  });

  it("rejects request with invalid signature", async () => {
    const request = new Request("http://example.com/mymap/0/0/0.png?v=1&sig=invalidsignature&exp=9999999999");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, AUTH_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(401);
  });

  it("rejects request with wrong secret", async () => {
    const url = await createAuthUrl(3600);
    const request = new Request(url);
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, { ...AUTH_ENV, AUTH_SECRET: "wrong-secret" }, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(401);
  });

  it("rejects request when exp is tampered after signing", async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const message = `v1:${exp}`;
    const sig = await AuthUtils.computeHmac("test-secret-key", message);
    const url = new URL(`http://example.com/mymap/0/0/0.png?v=1&sig=${toHex(sig)}&exp=${exp + 1}`);
    const request = new Request(url);
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, AUTH_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(401);
  });

  it("rejects odd-length hex sig", async () => {
    const request = new Request("http://example.com/mymap/0/0/0.png?v=1&sig=abc&exp=9999999999");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, AUTH_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(401);
  });

  it("rejects sig with invalid hex characters", async () => {
    const url = new URL("http://example.com/mymap/0/0/0.png?v=1&sig=zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz&exp=9999999999");
    const request = new Request(url);
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, AUTH_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(401);
  });

  it("passes request with valid signature", async () => {
    const url = await createAuthUrl(3600);
    const request = new Request(url);
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, AUTH_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(404);
  });

  it("passes request with valid signature and far future expiration", async () => {
    const url = await createAuthUrl(86400 * 30);
    const request = new Request(url);
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, AUTH_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(404);
  });

  it("passes request with extra unknown query params", async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const message = `v1:${exp}`;
    const sig = await AuthUtils.computeHmac("test-secret-key", message);
    const url = `http://example.com/mymap/0/0/0.png?v=1&sig=${toHex(sig)}&exp=${exp}&foo=bar`;
    const request = new Request(url);
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, AUTH_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(404);
  });

  it("passes request with exp at exact current second", async () => {
    const url = await createAuthUrl(0);
    const request = new Request(url);
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, AUTH_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.status).toBe(404);
  });

  it("returns Content-Type text/plain for auth errors", async () => {
    const request = new Request("http://example.com/mymap/0/0/0.png");
    const ctx = createExecutionContext();
    const response = await worker.fetch(request, AUTH_ENV, ctx);
    await waitOnExecutionContext(ctx);
    expect(response.headers.get("Content-Type")).toBe("text/plain");
  });
});
