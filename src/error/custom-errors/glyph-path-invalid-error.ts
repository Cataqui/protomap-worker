import { WorkerErrorCodes } from "../error-codes";
import { WorkerError } from "../worker-error";

export class GlyphPathInvalidError extends WorkerError {
  constructor(path: string) {
    super({
      code: WorkerErrorCodes.GLYPH_PATH_INVALID,
      status: 400,
      message: `Invalid glyph path '${path}'. Path must end in .pbf and must not contain '..' or null bytes.`,
      details: { path },
    });
  }
}
