import { WorkerErrorCodes } from "../error-codes";
import { WorkerError } from "../worker-error";

export class CompressionNotSupportedError extends WorkerError {
  constructor(compressionMethod: string) {
    super({
      code: WorkerErrorCodes.COMPRESSION_NOT_SUPPORTED,
      status: 501,
      message: `Archive uses compression method '${compressionMethod}' which is not supported. Only 'none' and 'gzip' compression are currently supported.`,
      details: { method: compressionMethod },
    });
  }
}
