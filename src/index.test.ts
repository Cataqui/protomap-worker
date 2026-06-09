/// <reference types="@cloudflare/vitest-pool-workers" />

import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("Worker fetch handler", () => {
  it("responds with 405 for POST requests", async () => {
    const response = await SELF.fetch("http://example.com/test.pmtiles", {
      method: "POST",
    });
    expect(response.status).toBe(405);
  });

  it("responds with 404 for invalid paths", async () => {
    const response = await SELF.fetch("http://example.com/invalid");
    expect(response.status).toBe(404);
  });

  it("responds with 404 for missing archives", async () => {
    const response = await SELF.fetch("http://example.com/nonexistent/0/0/0.png");
    expect(response.status).toBe(404);
  });

  it("handles tile path with valid format but missing archive", async () => {
    const response = await SELF.fetch("http://example.com/mymap/1/2/3.mvt");
    expect(response.status).toBe(404);
  });

  it("handles tileset JSON path with missing archive", async () => {
    const response = await SELF.fetch("http://example.com/mymap.json");
    expect(response.status).toBe(404);
  });

  it("sets CORS headers for allowed origins", async () => {
    const response = await SELF.fetch("http://example.com/mymap.json");
    expect(response.headers.get("Vary")).toBe("Origin");
  });
});
