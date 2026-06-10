import { describe, expect, it } from "vitest";
import { WorkerErrorCodes } from "../error-codes";
import { ArchiveNotFoundError } from "./archive-not-found-error";

describe("ArchiveNotFoundError", () => {
  const error = new ArchiveNotFoundError("mymap");

  it("extends WorkerError", () => {
    expect(error).toBeInstanceOf(Error);
  });

  it("has code ARCHIVE_NOT_FOUND", () => {
    expect(error.code).toBe(WorkerErrorCodes.ARCHIVE_NOT_FOUND);
  });

  it("has status 404", () => {
    expect(error.status).toBe(404);
  });

  it("includes the archive name in details", () => {
    expect(error.details).toEqual({ archiveName: "mymap" });
  });

  it("includes the archive name in the message", () => {
    expect(error.message).toContain("mymap");
  });

  it("has no param", () => {
    expect(error.param).toBeUndefined();
  });
});
