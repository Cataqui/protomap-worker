import { WorkerErrorCodes } from "../error-codes";
import { WorkerError } from "../worker-error";

export class AuthExpInvalidError extends WorkerError {
  constructor(providedValue: string) {
    super({
      code: WorkerErrorCodes.AUTH_EXP_INVALID,
      status: 401,
      message: `Parameter 'exp' must be a non-negative integer Unix timestamp (seconds since epoch). Received value: '${providedValue}'.`,
      param: "exp",
      details: { provided: providedValue },
    });
  }
}
