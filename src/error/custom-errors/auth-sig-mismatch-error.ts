import { WorkerErrorCodes } from "../error-codes";
import { WorkerError } from "../worker-error";

export class AuthSigMismatchError extends WorkerError {
  constructor() {
    super({
      code: WorkerErrorCodes.AUTH_SIG_MISMATCH,
      status: 401,
      message:
        "Signature verification failed. The provided 'sig' does not match the expected HMAC-SHA256 signature for the given 'exp' and 'v' parameters. Verify your AUTH_SECRET is correct and that 'exp' has not been modified after signing.",
    });
  }
}
