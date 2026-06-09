import { TileType, tileTypeExt } from "pmtiles";

export const EXT_TO_TILE_TYPE: Record<string, TileType> = {
  mvt: TileType.Mvt,
  pbf: TileType.Mvt,
  png: TileType.Png,
  jpg: TileType.Jpeg,
  webp: TileType.Webp,
  avif: TileType.Avif,
};

export const TILE_TYPE_TO_CONTENT_TYPE: Record<number, string> = {
  [TileType.Mvt]: "application/x-protobuf",
  [TileType.Png]: "image/png",
  [TileType.Jpeg]: "image/jpeg",
  [TileType.Webp]: "image/webp",
};

export { tileTypeExt };
