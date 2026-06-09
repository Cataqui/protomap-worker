import { WorkerErrorCodes } from "../error-codes";
import { WorkerError } from "../worker-error";

export class TileZoomOutOfRangeError extends WorkerError {
  constructor(requestedZoom: number, minZoom: number, maxZoom: number) {
    super({
      code: WorkerErrorCodes.TILE_ZOOM_OUT_OF_RANGE,
      status: 400,
      message: `Zoom level ${requestedZoom} is outside the archive's range [${minZoom}, ${maxZoom}]. Request a zoom level within the supported range.`,
      details: { requested: requestedZoom, min: minZoom, max: maxZoom },
    });
  }
}
