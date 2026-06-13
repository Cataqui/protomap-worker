export type Env = {
  // biome-ignore lint/style/useNamingConvention: config name
  ALLOWED_ORIGINS?: string;
  // biome-ignore lint/style/useNamingConvention: config name
  AUTH_SECRET?: string;
  // biome-ignore lint/style/useNamingConvention: config name
  BUCKET: R2Bucket;
  // biome-ignore lint/style/useNamingConvention: config name
  CACHE_CONTROL?: string;
  // biome-ignore lint/style/useNamingConvention: config name
  PUBLIC_HOSTNAME?: string;
};
