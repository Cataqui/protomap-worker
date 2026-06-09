import { WorkerErrorCodes } from "../error-codes";
import { WorkerError } from "../worker-error";

export class TileTypeMismatchError extends WorkerError {
  constructor(requestedExt: string, actualType: string) {
    super({
      code: WorkerErrorCodes.TILE_TYPE_MISMATCH,
      status: 400,
      message: `Tile type mismatch: requested '.${requestedExt}' but archive has type '${actualType}'. Use the correct file extension for this archive's tile type.`,
      details: { requested: requestedExt, actual: actualType },
    });
  }
}
