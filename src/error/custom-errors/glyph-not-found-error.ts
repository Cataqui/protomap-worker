import { WorkerErrorCodes } from "../error-codes";
import { WorkerError } from "../worker-error";

export class GlyphNotFoundError extends WorkerError {
  constructor(key: string) {
    super({
      code: WorkerErrorCodes.GLYPH_NOT_FOUND,
      status: 404,
      message: `Glyph '${key}' not found in R2 bucket. Verify the glyph path and ensure the file exists under the 'glyphs/' prefix.`,
      details: { key },
    });
  }
}
