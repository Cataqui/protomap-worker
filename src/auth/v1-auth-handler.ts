import { AuthExpInvalidError, AuthExpiredError, AuthParamMissingError, AuthSigInvalidHexError, AuthSigMismatchError } from "../error";
import { BytesUtils } from "../shared/bytes.utils";
import type { V1AuthParam } from "./auth.types";
import { AuthUtils } from "./auth.utils";
import type { AuthHandler } from "./auth-handler.interface";

export const V1_AUTH_PARAMS = ["sig", "exp"] as const;
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

  async authenticate(url: URL, secret: string): Promise<void> {
    const params = this.getParamsFromUrl(url);

    for (const param of V1_AUTH_PARAMS) if (!params[param]) throw new AuthParamMissingError(param);

    // biome-ignore lint/style/noNonNullAssertion: validated above
    const exp = params.exp!;
    // biome-ignore lint/style/noNonNullAssertion: validated above
    const sig = params.sig!;
    const expirationNumber = Number(exp);

    if (!Number.isInteger(expirationNumber) || expirationNumber < 0) throw new AuthExpInvalidError(exp);

    if (expirationNumber < Math.floor(Date.now() / 1000)) throw new AuthExpiredError(expirationNumber);

    const message = `v1:${expirationNumber}`;
    const computed = await AuthUtils.computeHmac(secret, message);
    const sigBytes = BytesUtils.hexToBytes(sig);

    if (!sigBytes) throw new AuthSigInvalidHexError();
    if (!AuthUtils.timingSafeEqual(sigBytes, computed)) throw new AuthSigMismatchError();
  }
}
