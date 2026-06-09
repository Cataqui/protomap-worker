import { EtagMismatch, type RangeResponse, type Source } from "pmtiles";
import { ArchiveNotFoundError } from "../error";
import { MapTileUtils } from "../shared/map-tile.utils";
import type { Env } from "../types/env.type";

export class R2Source implements Source {
  env: Env;
  archiveName: string;

  constructor(env: Env, archiveName: string) {
    this.env = env;
    this.archiveName = archiveName;
  }

  getKey() {
    return this.archiveName;
  }

  async getBytes(offset: number, length: number, _signal?: AbortSignal, etag?: string): Promise<RangeResponse> {
    const resp = await this.env.BUCKET.get(MapTileUtils.pmtilesPath(this.archiveName, this.env.PMTILES_PATH), {
      range: { offset: offset, length: length },
      onlyIf: { etagMatches: etag },
    });

    if (!resp) throw new ArchiveNotFoundError(this.archiveName);

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
