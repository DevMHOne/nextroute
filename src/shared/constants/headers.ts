export const NEXTROUTE_RESPONSE_HEADERS = {
  cache: "X-NextRoute-Cache",
  cacheHit: "X-NextRoute-Cache-Hit",
  latencyMs: "X-NextRoute-Latency-Ms",
  model: "X-NextRoute-Model",
  progress: "X-NextRoute-Progress",
  provider: "X-NextRoute-Provider",
  responseCost: "X-NextRoute-Response-Cost",
  tokensIn: "X-NextRoute-Tokens-In",
  tokensOut: "X-NextRoute-Tokens-Out",
} as const;
