export interface AuthHandler {
  authenticate(url: URL, secret: string): Promise<void>;
  stripParamsFromUrl(url: URL): void;
  getParamsFromUrl(url: URL): Record<string, string | null>;
  requiredParams(): readonly string[];
}
