import { describe, expect, it } from "vitest";
import {
  ArchiveNotFoundError,
  AuthExpInvalidError,
  AuthExpiredError,
  AuthParamMissingError,
  AuthSigInvalidHexError,
  AuthSigMismatchError,
  AuthVersionMissingError,
  AuthVersionUnknownError,
  CompressionNotSupportedError,
  MethodNotAllowedError,
  RouteNotFoundError,
  TileTypeMismatchError,
  TileZoomOutOfRangeError,
  WorkerError,
  WorkerErrorCodes,
} from "./index";

describe("WorkerError class", () => {
  it("extends Error", () => {
    const error = new WorkerError({ code: "ROUTE_NOT_FOUND", status: 404, message: "Not found" });
    expect(error).toBeInstanceOf(Error);
  });

  it("sets name to WorkerError", () => {
    const error = new WorkerError({ code: "ROUTE_NOT_FOUND", status: 404, message: "Not found" });
    expect(error.name).toBe("WorkerError");
  });

  it("stores code, status, and message", () => {
    const error = new WorkerError({
      code: "AUTH_SIG_MISMATCH",
      status: 401,
      message: "Signature verification failed.",
    });
    expect(error.code).toBe("AUTH_SIG_MISMATCH");
    expect(error.status).toBe(401);
    expect(error.message).toBe("Signature verification failed.");
  });

  it("stores param when provided", () => {
    const error = new WorkerError({
      code: "AUTH_PARAM_MISSING",
      status: 401,
      message: "Missing param",
      param: "sig",
    });
    expect(error.param).toBe("sig");
  });

  it("stores details when provided", () => {
    const error = new WorkerError({
      code: "TILE_ZOOM_OUT_OF_RANGE",
      status: 400,
      message: "Zoom out of range",
      details: { requested: 15, min: 0, max: 10 },
    });
    expect(error.details).toEqual({ requested: 15, min: 0, max: 10 });
  });

  it("leaves param undefined when not provided", () => {
    const error = new WorkerError({ code: "ROUTE_NOT_FOUND", status: 404, message: "Not found" });
    expect(error.param).toBeUndefined();
  });

  it("leaves details undefined when not provided", () => {
    const error = new WorkerError({ code: "ROUTE_NOT_FOUND", status: 404, message: "Not found" });
    expect(error.details).toBeUndefined();
  });
});

describe("WorkerError.toResponse()", () => {
  it("returns a Response with the correct status code", () => {
    const error = new WorkerError({ code: "AUTH_EXPIRED", status: 403, message: "Expired" });
    const response = error.toResponse();
    expect(response.status).toBe(403);
  });

  it("sets Content-Type to application/json", () => {
    const error = new WorkerError({ code: "ROUTE_NOT_FOUND", status: 404, message: "Not found" });
    const response = error.toResponse();
    expect(response.headers.get("Content-Type")).toBe("application/json");
  });

  it("includes code and message in the JSON body", async () => {
    const error = new WorkerError({ code: "ROUTE_NOT_FOUND", status: 404, message: "Not found" });
    const response = error.toResponse();
    const body = (await response.json()) as any;
    expect(body).toMatchObject({ code: "ROUTE_NOT_FOUND", message: "Not found" });
  });

  it("includes param in the JSON body when set", async () => {
    const error = new WorkerError({
      code: "AUTH_PARAM_MISSING",
      status: 401,
      message: "Missing param",
      param: "sig",
    });
    const response = error.toResponse();
    const body = (await response.json()) as any;
    expect(body.param).toBe("sig");
  });

  it("does not include param in the JSON body when not set", async () => {
    const error = new WorkerError({ code: "METHOD_NOT_ALLOWED", status: 405, message: "Not allowed" });
    const response = error.toResponse();
    const body = (await response.json()) as any;
    expect(body.param).toBeUndefined();
  });

  it("includes details fields at the top level", async () => {
    const error = new WorkerError({
      code: "TILE_ZOOM_OUT_OF_RANGE",
      status: 400,
      message: "Zoom out of range",
      details: { requested: 15, min: 0, max: 10 },
    });
    const response = error.toResponse();
    const body = (await response.json()) as any;
    expect(body.requested).toBe(15);
    expect(body.min).toBe(0);
    expect(body.max).toBe(10);
  });

  it("produces valid JSON", async () => {
    const error = new WorkerError({ code: "ROUTE_NOT_FOUND", status: 404, message: "Not found" });
    const response = error.toResponse();
    const body = (await response.json()) as any;
    expect(body.code).toBe("ROUTE_NOT_FOUND");
  });
});

describe("Error classes — Auth errors (401)", () => {
  describe("AuthVersionMissingError", () => {
    const error = new AuthVersionMissingError(["1", "2"]);

    it("has correct error code", () => {
      expect(error.code).toBe(WorkerErrorCodes.AUTH_VERSION_MISSING);
    });

    it("has status 401", () => {
      expect(error.status).toBe(401);
    });

    it("includes supported versions in the message", () => {
      expect(error.message).toContain("'v'");
      expect(error.message).toContain("1, 2");
    });
  });

  describe("AuthVersionUnknownError", () => {
    const error = new AuthVersionUnknownError("3", ["1", "2"]);

    it("has correct error code", () => {
      expect(error.code).toBe(WorkerErrorCodes.AUTH_VERSION_UNKNOWN);
    });

    it("has status 401", () => {
      expect(error.status).toBe(401);
    });

    it("includes the provided and supported versions in details", () => {
      expect(error.details).toEqual({ provided: "3", supported: ["1", "2"] });
    });

    it("includes the provided version in the message", () => {
      expect(error.message).toContain("'3'");
    });
  });

  describe("AuthParamMissingError", () => {
    const error = new AuthParamMissingError("sig");

    it("has correct error code", () => {
      expect(error.code).toBe(WorkerErrorCodes.AUTH_PARAM_MISSING);
    });

    it("has status 401", () => {
      expect(error.status).toBe(401);
    });

    it("has param set to the missing parameter name", () => {
      expect(error.param).toBe("sig");
    });

    it("includes the param in the message", () => {
      expect(error.message).toContain("'sig'");
    });
  });

  describe("AuthSigInvalidHexError", () => {
    const error = new AuthSigInvalidHexError();

    it("has correct error code", () => {
      expect(error.code).toBe(WorkerErrorCodes.AUTH_SIG_INVALID_HEX);
    });

    it("has status 401", () => {
      expect(error.status).toBe(401);
    });

    it("has param set to sig", () => {
      expect(error.param).toBe("sig");
    });

    it("mentions hex in the message", () => {
      expect(error.message).toContain("hex");
    });
  });

  describe("AuthSigMismatchError", () => {
    const error = new AuthSigMismatchError();

    it("has correct error code", () => {
      expect(error.code).toBe(WorkerErrorCodes.AUTH_SIG_MISMATCH);
    });

    it("has status 401", () => {
      expect(error.status).toBe(401);
    });

    it("does not have param set", () => {
      expect(error.param).toBeUndefined();
    });

    it("mentions HMAC in the message", () => {
      expect(error.message).toContain("HMAC");
    });
  });

  describe("AuthExpInvalidError", () => {
    const error = new AuthExpInvalidError("notanumber");

    it("has correct error code", () => {
      expect(error.code).toBe(WorkerErrorCodes.AUTH_EXP_INVALID);
    });

    it("has status 401", () => {
      expect(error.status).toBe(401);
    });

    it("has param set to exp", () => {
      expect(error.param).toBe("exp");
    });

    it("includes the provided value in the message", () => {
      expect(error.message).toContain("notanumber");
    });

    it("includes the provided value in details", () => {
      expect(error.details).toEqual({ provided: "notanumber" });
    });
  });
});

describe("Error classes — Auth errors (403)", () => {
  describe("AuthExpiredError", () => {
    const error = new AuthExpiredError(1717977600);

    it("has correct error code", () => {
      expect(error.code).toBe(WorkerErrorCodes.AUTH_EXPIRED);
    });

    it("has status 403", () => {
      expect(error.status).toBe(403);
    });

    it("has param set to exp", () => {
      expect(error.param).toBe("exp");
    });

    it("includes the expired timestamp in details", () => {
      expect(error.details).toEqual({ exp: 1717977600 });
    });
  });
});

describe("Error classes — HTTP errors", () => {
  describe("MethodNotAllowedError", () => {
    const error = new MethodNotAllowedError("POST");

    it("has correct error code", () => {
      expect(error.code).toBe(WorkerErrorCodes.METHOD_NOT_ALLOWED);
    });

    it("has status 405", () => {
      expect(error.status).toBe(405);
    });

    it("includes the method in the message", () => {
      expect(error.message).toContain("POST");
    });
  });

  describe("RouteNotFoundError", () => {
    const error = new RouteNotFoundError("/invalid/path");

    it("has correct error code", () => {
      expect(error.code).toBe(WorkerErrorCodes.ROUTE_NOT_FOUND);
    });

    it("has status 404", () => {
      expect(error.status).toBe(404);
    });

    it("includes the path in the message", () => {
      expect(error.message).toContain("/invalid/path");
    });
  });
});

describe("Error classes — Tile serving errors", () => {
  describe("TileTypeMismatchError", () => {
    const error = new TileTypeMismatchError("mvt", "png");

    it("has correct error code", () => {
      expect(error.code).toBe(WorkerErrorCodes.TILE_TYPE_MISMATCH);
    });

    it("has status 400", () => {
      expect(error.status).toBe(400);
    });

    it("includes requested and actual in details", () => {
      expect(error.details).toEqual({ requested: "mvt", actual: "png" });
    });

    it("includes extensions in the message", () => {
      expect(error.message).toContain("mvt");
      expect(error.message).toContain("png");
    });
  });

  describe("TileZoomOutOfRangeError", () => {
    const error = new TileZoomOutOfRangeError(15, 0, 10);

    it("has correct error code", () => {
      expect(error.code).toBe(WorkerErrorCodes.TILE_ZOOM_OUT_OF_RANGE);
    });

    it("has status 400", () => {
      expect(error.status).toBe(400);
    });

    it("includes zoom details in details", () => {
      expect(error.details).toEqual({ requested: 15, min: 0, max: 10 });
    });

    it("includes zoom values in the message", () => {
      expect(error.message).toContain("15");
      expect(error.message).toContain("0");
      expect(error.message).toContain("10");
    });
  });
});

describe("Error classes — Storage errors", () => {
  describe("ArchiveNotFoundError", () => {
    const error = new ArchiveNotFoundError("mymap");

    it("has correct error code", () => {
      expect(error.code).toBe(WorkerErrorCodes.ARCHIVE_NOT_FOUND);
    });

    it("has status 404", () => {
      expect(error.status).toBe(404);
    });

    it("includes archiveName in details", () => {
      expect(error.details).toEqual({ archiveName: "mymap" });
    });

    it("includes the archive name in the message", () => {
      expect(error.message).toContain("mymap");
    });
  });
});

describe("Error classes — Compression errors", () => {
  describe("CompressionNotSupportedError", () => {
    const error = new CompressionNotSupportedError("Brotli");

    it("has correct error code", () => {
      expect(error.code).toBe(WorkerErrorCodes.COMPRESSION_NOT_SUPPORTED);
    });

    it("has status 501", () => {
      expect(error.status).toBe(501);
    });

    it("includes the compression method in details", () => {
      expect(error.details).toEqual({ method: "Brotli" });
    });

    it("includes the method in the message", () => {
      expect(error.message).toContain("Brotli");
    });
  });
});

describe("All error classes produce distinct error codes", () => {
  it("every error class has a unique error code", () => {
    const errors = [
      new AuthVersionMissingError(["1"]),
      new AuthVersionUnknownError("2", ["1"]),
      new AuthParamMissingError("test"),
      new AuthSigInvalidHexError(),
      new AuthSigMismatchError(),
      new AuthExpInvalidError("abc"),
      new AuthExpiredError(0),
      new MethodNotAllowedError("POST"),
      new RouteNotFoundError("/test"),
      new TileTypeMismatchError("a", "b"),
      new TileZoomOutOfRangeError(1, 0, 2),
      new ArchiveNotFoundError("test"),
      new CompressionNotSupportedError("test"),
    ];

    const codes = new Set(errors.map((e) => e.code));
    expect(codes.size).toBe(errors.length);
  });
});
