import { WorkerErrorCodes } from "../error-codes";
import { WorkerError } from "../worker-error";

export class AuthSigInvalidHexError extends WorkerError {
  constructor() {
    super({
      code: WorkerErrorCodes.AUTH_SIG_INVALID_HEX,
      status: 401,
      message: "Parameter 'sig' contains invalid hexadecimal characters. The 'sig' parameter must be an even-length string of hex characters (0-9, a-f).",
      param: "sig",
    });
  }
}
