import type { V1_AUTH_PARAMS } from "./v1-auth-handler";

export type AuthResult = { ok: true } | { ok: false; status: 401 | 403; message: string };
export type V1AuthParam = (typeof V1_AUTH_PARAMS)[number];
