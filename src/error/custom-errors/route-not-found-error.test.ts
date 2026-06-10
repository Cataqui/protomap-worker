import { describe, expect, it } from "vitest";
import { WorkerErrorCodes } from "../error-codes";
import { RouteNotFoundError } from "./route-not-found-error";

describe("RouteNotFoundError", () => {
  const error = new RouteNotFoundError("/invalid/path");

  it("extends WorkerError", () => {
    expect(error).toBeInstanceOf(Error);
  });

  it("has code ROUTE_NOT_FOUND", () => {
    expect(error.code).toBe(WorkerErrorCodes.ROUTE_NOT_FOUND);
  });

  it("has status 404", () => {
    expect(error.status).toBe(404);
  });

  it("has no param", () => {
    expect(error.param).toBeUndefined();
  });

  it("has no details", () => {
    expect(error.details).toBeUndefined();
  });

  it("includes the path in the message", () => {
    expect(error.message).toContain("/invalid/path");
  });
});
