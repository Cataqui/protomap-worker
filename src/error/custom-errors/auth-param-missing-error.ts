import { WorkerErrorCodes } from "../error-codes";
import { WorkerError } from "../worker-error";

export class AuthParamMissingError extends WorkerError {
  constructor(param: string) {
    super({
      code: WorkerErrorCodes.AUTH_PARAM_MISSING,
      status: 401,
      message: `Missing required authentication parameter '${param}'. Provide the '${param}' query parameter in your request URL.`,
      param,
    });
  }
}
