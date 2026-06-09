import { WorkerErrorCodes } from "../error-codes";
import { WorkerError } from "../worker-error";

export class AuthVersionMissingError extends WorkerError {
  constructor(supportedVersions: string[]) {
    super({
      code: WorkerErrorCodes.AUTH_VERSION_MISSING,
      status: 401,
      message: `Missing authentication version parameter 'v'. Provide the 'v' query parameter to select an authentication version. Supported versions: ${supportedVersions.join(", ")}.`,
    });
  }
}
