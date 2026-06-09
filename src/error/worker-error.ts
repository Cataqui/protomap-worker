import type { WorkerErrorCode } from "./error-codes";

export class WorkerError extends Error {
  readonly code: WorkerErrorCode;
  readonly status: number;
  readonly param?: string;
  readonly details?: Record<string, unknown>;

  constructor({
    code,
    status,
    message,
    param,
    details,
  }: {
    code: WorkerErrorCode;
    status: number;
    message: string;
    param?: string;
    details?: Record<string, unknown>;
  }) {
    super(message);
    this.name = "WorkerError";
    this.code = code;
    this.status = status;
    this.param = param;
    this.details = details;
  }

  toResponse(): Response {
    return new Response(
      JSON.stringify({
        code: this.code,
        message: this.message,
        ...(this.param !== undefined && { param: this.param }),
        ...this.details,
      }),
      {
        status: this.status,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
