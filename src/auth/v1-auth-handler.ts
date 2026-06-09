import type { AuthHandler } from "../interfaces/auth-handler.interface";
import { BytesUtils } from "../shared/bytes.utils";
import type { AuthResult, V1AuthParam } from "./auth.types";
import { AuthUtils } from "./auth.utils";

export const V1_AUTH_PARAMS = ["v", "sig", "exp"] as const;
type V1AuthParamsMap = { [K in V1AuthParam]: string | null };

export class V1AuthHandler implements AuthHandler {
  requiredParams(): readonly V1AuthParam[] {
    return V1_AUTH_PARAMS;
  }

  getParamsFromUrl(url: URL): V1AuthParamsMap {
    const result = {} as V1AuthParamsMap;

    for (const param of V1_AUTH_PARAMS) result[param] = url.searchParams.get(param);
    return result;
  }

  stripParamsFromUrl(url: URL): void {
    for (const param of V1_AUTH_PARAMS) url.searchParams.delete(param);
  }

  async authenticate(url: URL, secret: string): Promise<AuthResult> {
    const params = this.getParamsFromUrl(url);

    if (!params.sig || !params.exp) return { ok: false, status: 401, message: "Unauthorized" };

    const expirationNumber = Number(params.exp);

    if (!Number.isInteger(expirationNumber) || expirationNumber < 0) {
      return { ok: false, status: 401, message: "Unauthorized" };
    }

    if (expirationNumber < Math.floor(Date.now() / 1000)) {
      return { ok: false, status: 403, message: "Forbidden" };
    }

    const message = `v1:${expirationNumber}`;
    const computed = await AuthUtils.computeHmac(secret, message);
    const sigBytes = BytesUtils.hexToBytes(params.sig);

    if (!sigBytes || !AuthUtils.timingSafeEqual(sigBytes, computed)) {
      return { ok: false, status: 401, message: "Unauthorized" };
    }

    return { ok: true };
  }
}
