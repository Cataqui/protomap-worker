import { WorkerErrorCodes } from "../error-codes";
import { WorkerError } from "../worker-error";

export class AuthExpiredError extends WorkerError {
  constructor(expValue: number) {
    super({
      code: WorkerErrorCodes.AUTH_EXPIRED,
      status: 403,
      message: `Authentication token has expired. The 'exp' timestamp (${expValue}) is in the past. Generate a new signature with a future 'exp' value.`,
      param: "exp",
      details: { exp: expValue },
    });
  }
}
