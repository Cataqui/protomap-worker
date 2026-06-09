import type { AuthResult } from "../auth/auth.types";

export interface AuthHandler {
  authenticate(url: URL, secret: string): Promise<AuthResult>;
  stripParamsFromUrl(url: URL): void;
  getParamsFromUrl(url: URL): Record<string, string | null>;
  requiredParams(): readonly string[];
}
