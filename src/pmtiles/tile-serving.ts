import type { PMTiles } from "pmtiles";
import { EXT_TO_TILE_TYPE, TILE_TYPE_TO_CONTENT_TYPE, tileTypeExt } from "./pmtiles.constants";

export async function servePmtilesRequest(
  pmtiles: PMTiles,
  name: string,
  tile: [number, number, number] | undefined,
  ext: string,
  publicHostname: string,
): Promise<{
  body?: ArrayBuffer | string;
  status: number;
  contentType?: string;
}> {
  const pHeader = await pmtiles.getHeader();

  if (!tile) {
    const t = await pmtiles.getTileJson(`https://${publicHostname}/${name}`);
    return { body: JSON.stringify(t), status: 200, contentType: "application/json" };
  }

  if (tile[0] < pHeader.minZoom || tile[0] > pHeader.maxZoom) return { status: 404 };

  const expectedType = EXT_TO_TILE_TYPE[ext];
  if (pHeader.tileType !== expectedType && tileTypeExt(pHeader.tileType) !== "") {
    return {
      body: `Bad request: requested .${ext} but archive has type ${tileTypeExt(pHeader.tileType)}`,
      status: 400,
    };
  }

  const tiledata = await pmtiles.getZxy(tile[0], tile[1], tile[2]);
  const contentType = TILE_TYPE_TO_CONTENT_TYPE[pHeader.tileType];

  if (tiledata) return { body: tiledata.data, status: 200, contentType };

  return { status: 204, contentType };
}
