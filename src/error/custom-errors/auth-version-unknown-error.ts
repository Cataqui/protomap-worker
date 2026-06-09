import { WorkerErrorCodes } from "../error-codes";
import { WorkerError } from "../worker-error";

export class AuthVersionUnknownError extends WorkerError {
  constructor(providedVersion: string, supportedVersions: string[]) {
    super({
      code: WorkerErrorCodes.AUTH_VERSION_UNKNOWN,
      status: 401,
      message: `Unknown authentication version '${providedVersion}'. Supported versions: ${supportedVersions.join(", ")}.`,
      details: { provided: providedVersion, supported: supportedVersions },
    });
  }
}
