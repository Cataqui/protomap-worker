import { describe, expect, it } from "vitest";
import { AuthUtils } from "./auth.utils";
import { V1_AUTH_PARAMS, V1AuthHandler } from "./v1-auth-handler";

const SECRET = "test-secret-key";
const handler = new V1AuthHandler();

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function createValidUrl(expOffset: number = 3600): Promise<URL> {
  const exp = Math.floor(Date.now() / 1000) + expOffset;
  const sig = await AuthUtils.computeHmac(SECRET, `v1:${exp}`);
  return new URL(`https://example.com/mymap/0/0/0.png?v=1&sig=${toHex(sig)}&exp=${exp}`);
}

describe("V1AuthHandler", () => {
  it("passes with valid signature and future expiration", async () => {
    const url = await createValidUrl();
    const result = await handler.authenticate(url, SECRET);
    expect(result.ok).toBe(true);
  });

  it("passes with valid signature and far future expiration", async () => {
    const url = await createValidUrl(86400 * 30);
    const result = await handler.authenticate(url, SECRET);
    expect(result.ok).toBe(true);
  });

  it("returns 401 when sig param is missing", async () => {
    const url = new URL("https://example.com/mymap/0/0/0.png?v=1&exp=123");
    const result = await handler.authenticate(url, SECRET);
    expect(result).toEqual({ ok: false, status: 401, message: "Unauthorized" });
  });

  it("returns 401 when exp param is missing", async () => {
    const url = new URL("https://example.com/mymap/0/0/0.png?v=1&sig=abc");
    const result = await handler.authenticate(url, SECRET);
    expect(result).toEqual({ ok: false, status: 401, message: "Unauthorized" });
  });

  it("returns 401 when both sig and exp are missing", async () => {
    const url = new URL("https://example.com/mymap/0/0/0.png?v=1");
    const result = await handler.authenticate(url, SECRET);
    expect(result).toEqual({ ok: false, status: 401, message: "Unauthorized" });
  });

  it("returns 401 for non-numeric exp", async () => {
    const url = new URL("https://example.com/mymap/0/0/0.png?v=1&sig=abc&exp=notanumber");
    const result = await handler.authenticate(url, SECRET);
    expect(result).toEqual({ ok: false, status: 401, message: "Unauthorized" });
  });

  it("returns 401 for negative exp", async () => {
    const url = new URL("https://example.com/mymap/0/0/0.png?v=1&sig=abc&exp=-1");
    const result = await handler.authenticate(url, SECRET);
    expect(result).toEqual({ ok: false, status: 401, message: "Unauthorized" });
  });

  it("returns 401 for floating-point exp", async () => {
    const url = new URL("https://example.com/mymap/0/0/0.png?v=1&sig=abc&exp=123.456");
    const result = await handler.authenticate(url, SECRET);
    expect(result).toEqual({ ok: false, status: 401, message: "Unauthorized" });
  });

  it("returns 403 for expired exp", async () => {
    const url = await createValidUrl(-3600);
    const result = await handler.authenticate(url, SECRET);
    expect(result).toEqual({ ok: false, status: 403, message: "Forbidden" });
  });

  it("returns 403 for exp exactly 1 second in the past", async () => {
    const url = await createValidUrl(-1);
    const result = await handler.authenticate(url, SECRET);
    expect(result).toEqual({ ok: false, status: 403, message: "Forbidden" });
  });

  it("returns 401 when using wrong secret", async () => {
    const url = await createValidUrl();
    const result = await handler.authenticate(url, "wrong-secret");
    expect(result).toEqual({ ok: false, status: 401, message: "Unauthorized" });
  });

  it("returns 401 when exp is tampered after signing", async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const sig = await AuthUtils.computeHmac(SECRET, `v1:${exp}`);
    const url = new URL(`https://example.com/mymap/0/0/0.png?v=1&sig=${toHex(sig)}&exp=${exp + 1}`);
    const result = await handler.authenticate(url, SECRET);
    expect(result).toEqual({ ok: false, status: 401, message: "Unauthorized" });
  });

  it("passes with extra unknown query params", async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const sig = await AuthUtils.computeHmac(SECRET, `v1:${exp}`);
    const url = new URL(`https://example.com/mymap/0/0/0.png?v=1&sig=${toHex(sig)}&exp=${exp}&foo=bar`);
    const result = await handler.authenticate(url, SECRET);
    expect(result.ok).toBe(true);
  });

  it("passes with exp at exact current second", async () => {
    const url = await createValidUrl(0);
    const result = await handler.authenticate(url, SECRET);
    expect(result.ok).toBe(true);
  });

  it("returns 401 for odd-length hex sig", async () => {
    const url = new URL("https://example.com/mymap/0/0/0.png?v=1&sig=abc&exp=9999999999");
    const result = await handler.authenticate(url, SECRET);
    expect(result).toEqual({ ok: false, status: 401, message: "Unauthorized" });
  });

  it("returns 401 for sig with invalid hex characters", async () => {
    const url = new URL("https://example.com/mymap/0/0/0.png?v=1&sig=zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz&exp=9999999999");
    const result = await handler.authenticate(url, SECRET);
    expect(result).toEqual({ ok: false, status: 401, message: "Unauthorized" });
  });

  it("returns 401 for empty sig", async () => {
    const url = new URL("https://example.com/mymap/0/0/0.png?v=1&sig=&exp=9999999999");
    const result = await handler.authenticate(url, SECRET);
    expect(result).toEqual({ ok: false, status: 401, message: "Unauthorized" });
  });

  it("returns 401 for empty exp", async () => {
    const url = new URL("https://example.com/mymap/0/0/0.png?v=1&sig=abc&exp=");
    const result = await handler.authenticate(url, SECRET);
    expect(result).toEqual({ ok: false, status: 401, message: "Unauthorized" });
  });
});

describe("V1AuthHandler.stripParams", () => {
  it("strips v, sig, and exp params", () => {
    const url = new URL("https://example.com/mymap/0/0/0.png?v=1&sig=abc&exp=123");
    handler.stripParamsFromUrl(url);
    expect(url.search).toBe("");
  });

  it("preserves other query params", () => {
    const url = new URL("https://example.com/mymap/0/0/0.png?v=1&sig=abc&exp=123&foo=bar");
    handler.stripParamsFromUrl(url);
    expect(url.searchParams.get("foo")).toBe("bar");
    expect(url.searchParams.has("v")).toBe(false);
    expect(url.searchParams.has("sig")).toBe(false);
    expect(url.searchParams.has("exp")).toBe(false);
  });

  it("does nothing when no auth params are present", () => {
    const url = new URL("https://example.com/mymap.json");
    handler.stripParamsFromUrl(url);
    expect(url.search).toBe("");
  });

  it("handles partial auth params", () => {
    const url = new URL("https://example.com/mymap/0/0/0.png?v=1");
    handler.stripParamsFromUrl(url);
    expect(url.search).toBe("");
  });

  it("handles URL with no query params", () => {
    const url = new URL("https://example.com/mymap/0/0/0.png");
    handler.stripParamsFromUrl(url);
    expect(url.search).toBe("");
  });
});

describe("V1AuthHandler.requiredParams", () => {
  it("returns the V1_AUTH_PARAMS const", () => {
    const params = handler.requiredParams();
    expect([...params]).toEqual([...V1_AUTH_PARAMS]);
  });
});
