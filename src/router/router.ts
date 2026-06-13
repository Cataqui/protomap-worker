import { GlyphPathInvalidError } from "../error";
import { MapTileUtils } from "../shared/map-tile.utils";

const REGION_PATH_PREFIX = "/regions/";
const GLYPH_PATH_PREFIX = "/glyphs/";

function _validateGlyphPath(path: string): string {
  if (path.includes("\0")) throw new GlyphPathInvalidError(path);
  if (path.includes("..")) throw new GlyphPathInvalidError(path);
  if (!path.endsWith(".pbf")) throw new GlyphPathInvalidError(path);
  return path;
}

export function parseRoute(
  pathname: string,
): { ok: true; type: "regions"; name: string; tile?: [number, number, number]; ext: string } | { ok: true; type: "glyphs"; key: string } | { ok: false } {
  if (pathname.startsWith(REGION_PATH_PREFIX)) {
    const remainder = `/${pathname.slice(REGION_PATH_PREFIX.length)}`;
    const parsed = MapTileUtils.tilePath(remainder);
    if (!parsed.ok) return { ok: false };
    return { ok: true, type: "regions", name: parsed.name, tile: parsed.tile, ext: parsed.ext };
  }

  if (pathname.startsWith(GLYPH_PATH_PREFIX)) {
    const rawPath = pathname.slice(GLYPH_PATH_PREFIX.length);
    if (!rawPath) return { ok: false };
    const validatedPath = _validateGlyphPath(rawPath);
    return { ok: true, type: "glyphs", key: validatedPath };
  }

  return { ok: false };
}
