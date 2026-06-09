import { describe, expect, it } from "vitest";
import { BytesUtils } from "./bytes.utils";

describe("hexToBytes", () => {
  it("converts a hex string to bytes", () => {
    const result = BytesUtils.hexToBytes("ab12cd");
    expect(result).toEqual(new Uint8Array([0xab, 0x12, 0xcd]));
  });

  it("handles uppercase hex", () => {
    const result = BytesUtils.hexToBytes("FF00");
    expect(result).toEqual(new Uint8Array([0xff, 0x00]));
  });

  it("returns null for odd-length hex", () => {
    expect(BytesUtils.hexToBytes("abc")).toBeNull();
  });

  it("returns null for invalid hex characters", () => {
    expect(BytesUtils.hexToBytes("zzgg")).toBeNull();
  });

  it("returns empty Uint8Array for empty string", () => {
    const result = BytesUtils.hexToBytes("");
    expect(result).toEqual(new Uint8Array(0));
  });
});
