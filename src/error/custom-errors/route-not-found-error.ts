import { WorkerErrorCodes } from "../error-codes";
import { WorkerError } from "../worker-error";

export class RouteNotFoundError extends WorkerError {
  constructor(path: string) {
    super({
      code: WorkerErrorCodes.ROUTE_NOT_FOUND,
      status: 404,
      message: `No route matches the requested path '${path}'. Expected patterns: '/regions/{name}/{z}/{x}/{y}.{ext}' for tiles, '/regions/{name}.json' for TileJSON metadata, or '/glyphs/{path}' for font glyphs.`,
    });
  }
}
