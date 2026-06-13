import { WorkerErrorCodes } from "../error-codes";
import { WorkerError } from "../worker-error";

export class ArchiveNotFoundError extends WorkerError {
  constructor(archiveName: string) {
    super({
      code: WorkerErrorCodes.ARCHIVE_NOT_FOUND,
      status: 404,
      message: `Archive '${archiveName}' not found in R2 bucket. Verify the region name and ensure the file exists under the 'regions/' prefix.`,
      details: { archiveName },
    });
  }
}
