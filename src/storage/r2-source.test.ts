import { describe, expect, it } from "vitest";
import { ArchiveNotFoundError, WorkerErrorCodes } from "../error";

describe("ArchiveNotFoundError", () => {
  it("is an instance of Error", () => {
    const error = new ArchiveNotFoundError("test-archive");
    expect(error).toBeInstanceOf(Error);
  });

  it("has code ARCHIVE_NOT_FOUND", () => {
    const error = new ArchiveNotFoundError("test-archive");
    expect(error.code).toBe(WorkerErrorCodes.ARCHIVE_NOT_FOUND);
  });

  it("has status 404", () => {
    const error = new ArchiveNotFoundError("test-archive");
    expect(error.status).toBe(404);
  });

  it("includes the archive name in details", () => {
    const error = new ArchiveNotFoundError("custom-archive");
    expect(error.details).toEqual({ archiveName: "custom-archive" });
  });

  it("includes the archive name in the message", () => {
    const error = new ArchiveNotFoundError("my-map");
    expect(error.message).toContain("my-map");
  });
});
