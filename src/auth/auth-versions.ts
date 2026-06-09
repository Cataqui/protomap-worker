import type { AuthHandler } from "./auth-handler.interface";
import { V1AuthHandler } from "./v1-auth-handler";

export const AUTH_VERSIONS: Record<string, AuthHandler> = {
  "1": new V1AuthHandler(),
};
