import { EtagMismatch, type RangeResponse, type Source } from "pmtiles";
import { ArchiveNotFoundError } from "../error";

export class R2Source implements Source {
  bucket: R2Bucket;
  r2Key: string;

  constructor(bucket: R2Bucket, r2Key: string) {
    this.bucket = bucket;
    this.r2Key = r2Key;
  }

  getKey() {
    return this.r2Key;
  }

  async getBytes(offset: number, length: number, _signal?: AbortSignal, etag?: string): Promise<RangeResponse> {
    const resp = await this.bucket.get(this.r2Key, {
      range: { offset: offset, length: length },
      onlyIf: { etagMatches: etag },
    });

    if (!resp) throw new ArchiveNotFoundError(this.r2Key);

    const o = resp as R2ObjectBody;

    if (!o.body) throw new EtagMismatch();

    const a = await o.arrayBuffer();
    return {
      data: a,
      etag: o.etag,
      cacheControl: o.httpMetadata?.cacheControl,
      expires: o.httpMetadata?.cacheExpiry?.toISOString(),
    };
  }
}
