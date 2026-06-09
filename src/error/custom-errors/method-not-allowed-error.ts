import { WorkerErrorCodes } from "../error-codes";
import { WorkerError } from "../worker-error";

export class MethodNotAllowedError extends WorkerError {
  constructor(method: string) {
    super({
      code: WorkerErrorCodes.METHOD_NOT_ALLOWED,
      status: 405,
      message: `Method ${method.toUpperCase()} is not allowed. Only GET requests are supported for tile and TileJSON endpoints.`,
    });
  }
}
