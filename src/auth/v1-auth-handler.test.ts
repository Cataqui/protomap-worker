import { describe, expect, it } from "vitest";
import { WorkerErrorCodes } from "../error";
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
    await expect(handler.authenticate(url, SECRET)).resolves.toBeUndefined();
  });

  it("passes with valid signature and far future expiration", async () => {
    const url = await createValidUrl(86400 * 30);
    await expect(handler.authenticate(url, SECRET)).resolves.toBeUndefined();
  });

  it("throws AUTH_PARAM_MISSING when sig param is missing", async () => {
    const url = new URL("https://example.com/mymap/0/0/0.png?v=1&exp=123");
    await expect(handler.authenticate(url, SECRET)).rejects.toMatchObject({
      code: WorkerErrorCodes.AUTH_PARAM_MISSING,
      status: 401,
      param: "sig",
    });
  });

  it("throws AUTH_PARAM_MISSING when exp param is missing", async () => {
    const url = new URL("https://example.com/mymap/0/0/0.png?v=1&sig=abc");
    await expect(handler.authenticate(url, SECRET)).rejects.toMatchObject({
      code: WorkerErrorCodes.AUTH_PARAM_MISSING,
      status: 401,
      param: "exp",
    });
  });

  it("throws AUTH_PARAM_MISSING when both sig and exp are missing (checks sig first)", async () => {
    const url = new URL("https://example.com/mymap/0/0/0.png?v=1");
    await expect(handler.authenticate(url, SECRET)).rejects.toMatchObject({
      code: WorkerErrorCodes.AUTH_PARAM_MISSING,
      param: "sig",
    });
  });

  it("throws AUTH_EXP_INVALID for non-numeric exp", async () => {
    const url = new URL("https://example.com/mymap/0/0/0.png?v=1&sig=abc&exp=notanumber");
    await expect(handler.authenticate(url, SECRET)).rejects.toMatchObject({
      code: WorkerErrorCodes.AUTH_EXP_INVALID,
      status: 401,
      param: "exp",
    });
  });

  it("throws AUTH_EXP_INVALID for negative exp", async () => {
    const url = new URL("https://example.com/mymap/0/0/0.png?v=1&sig=abc&exp=-1");
    await expect(handler.authenticate(url, SECRET)).rejects.toMatchObject({
      code: WorkerErrorCodes.AUTH_EXP_INVALID,
      status: 401,
    });
  });

  it("throws AUTH_EXP_INVALID for floating-point exp", async () => {
    const url = new URL("https://example.com/mymap/0/0/0.png?v=1&sig=abc&exp=123.456");
    await expect(handler.authenticate(url, SECRET)).rejects.toMatchObject({
      code: WorkerErrorCodes.AUTH_EXP_INVALID,
      status: 401,
    });
  });

  it("throws AUTH_EXPIRED for expired exp", async () => {
    const url = await createValidUrl(-3600);
    await expect(handler.authenticate(url, SECRET)).rejects.toMatchObject({
      code: WorkerErrorCodes.AUTH_EXPIRED,
      status: 403,
      param: "exp",
    });
  });

  it("throws AUTH_EXPIRED for exp exactly 1 second in the past", async () => {
    const url = await createValidUrl(-1);
    await expect(handler.authenticate(url, SECRET)).rejects.toMatchObject({
      code: WorkerErrorCodes.AUTH_EXPIRED,
      status: 403,
    });
  });

  it("throws AUTH_SIG_MISMATCH when using wrong secret", async () => {
    const url = await createValidUrl();
    await expect(handler.authenticate(url, "wrong-secret")).rejects.toMatchObject({
      code: WorkerErrorCodes.AUTH_SIG_MISMATCH,
      status: 401,
    });
  });

  it("throws AUTH_SIG_MISMATCH when exp is tampered after signing", async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const sig = await AuthUtils.computeHmac(SECRET, `v1:${exp}`);
    const url = new URL(`https://example.com/mymap/0/0/0.png?v=1&sig=${toHex(sig)}&exp=${exp + 1}`);
    await expect(handler.authenticate(url, SECRET)).rejects.toMatchObject({
      code: WorkerErrorCodes.AUTH_SIG_MISMATCH,
      status: 401,
    });
  });

  it("passes with extra unknown query params", async () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const sig = await AuthUtils.computeHmac(SECRET, `v1:${exp}`);
    const url = new URL(`https://example.com/mymap/0/0/0.png?v=1&sig=${toHex(sig)}&exp=${exp}&foo=bar`);
    await expect(handler.authenticate(url, SECRET)).resolves.toBeUndefined();
  });

  it("passes with exp at exact current second", async () => {
    const url = await createValidUrl(0);
    await expect(handler.authenticate(url, SECRET)).resolves.toBeUndefined();
  });

  it("throws AUTH_SIG_INVALID_HEX for odd-length hex sig", async () => {
    const url = new URL("https://example.com/mymap/0/0/0.png?v=1&sig=abc&exp=9999999999");
    await expect(handler.authenticate(url, SECRET)).rejects.toMatchObject({
      code: WorkerErrorCodes.AUTH_SIG_INVALID_HEX,
      status: 401,
    });
  });

  it("throws AUTH_SIG_INVALID_HEX for sig with invalid hex characters", async () => {
    const url = new URL("https://example.com/mymap/0/0/0.png?v=1&sig=zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz&exp=9999999999");
    await expect(handler.authenticate(url, SECRET)).rejects.toMatchObject({
      code: WorkerErrorCodes.AUTH_SIG_INVALID_HEX,
      status: 401,
    });
  });

  it("throws AUTH_PARAM_MISSING with param sig for empty sig", async () => {
    const url = new URL("https://example.com/mymap/0/0/0.png?v=1&sig=&exp=9999999999");
    await expect(handler.authenticate(url, SECRET)).rejects.toMatchObject({
      code: WorkerErrorCodes.AUTH_PARAM_MISSING,
      param: "sig",
    });
  });

  it("throws AUTH_PARAM_MISSING with param exp for empty exp", async () => {
    const url = new URL("https://example.com/mymap/0/0/0.png?v=1&sig=abc&exp=");
    await expect(handler.authenticate(url, SECRET)).rejects.toMatchObject({
      code: WorkerErrorCodes.AUTH_PARAM_MISSING,
      param: "exp",
    });
  });
});

describe("V1AuthHandler.stripParams", () => {
  it("strips sig and exp params, leaves other params intact", () => {
    const url = new URL("https://example.com/mymap/0/0/0.png?v=1&sig=abc&exp=123");
    handler.stripParamsFromUrl(url);
    expect(url.searchParams.has("sig")).toBe(false);
    expect(url.searchParams.has("exp")).toBe(false);
  });

  it("preserves other query params including v", () => {
    const url = new URL("https://example.com/mymap/0/0/0.png?v=1&sig=abc&exp=123&foo=bar");
    handler.stripParamsFromUrl(url);
    expect(url.searchParams.get("foo")).toBe("bar");
    expect(url.searchParams.has("v")).toBe(true);
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
    expect(url.searchParams.get("v")).toBe("1");
    expect(url.searchParams.has("sig")).toBe(false);
    expect(url.searchParams.has("exp")).toBe(false);
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
