import test from "node:test";
import assert from "node:assert/strict";

import {
  buildNextRouteResponseMetaHeaders,
  buildNextRouteSseMetadataComment,
  formatNextRouteCost,
  getNextRouteTokenCounts,
} from "../../src/domain/nextrouteResponseMeta.ts";

test("getNextRouteTokenCounts normalizes common usage shapes", () => {
  assert.deepEqual(
    getNextRouteTokenCounts({
      prompt_tokens: 12,
      completion_tokens: 5,
    }),
    { input: 12, output: 5 }
  );
  assert.deepEqual(
    getNextRouteTokenCounts({
      input_tokens: "9",
      output_tokens: "4",
    }),
    { input: 9, output: 4 }
  );
});

test("buildNextRouteResponseMetaHeaders formats provider alias, tokens, latency, and cost", () => {
  const headers = buildNextRouteResponseMetaHeaders({
    provider: "claude",
    model: "claude-sonnet-4-6",
    cacheHit: true,
    latencyMs: 1234.6,
    usage: {
      prompt_tokens: 11,
      completion_tokens: 7,
    },
    costUsd: 0.00123456789,
  });

  assert.equal(headers["X-NextRoute-Provider"], "cc");
  assert.equal(headers["X-NextRoute-Model"], "claude-sonnet-4-6");
  assert.equal(headers["X-NextRoute-Cache-Hit"], "true");
  assert.equal(headers["X-NextRoute-Latency-Ms"], "1235");
  assert.equal(headers["X-NextRoute-Tokens-In"], "11");
  assert.equal(headers["X-NextRoute-Tokens-Out"], "7");
  assert.equal(headers["X-NextRoute-Response-Cost"], "0.0012345679");
});

test("buildNextRouteSseMetadataComment emits comment lines compatible with SSE", () => {
  const comment = buildNextRouteSseMetadataComment({
    provider: "openai",
    model: "gpt-4o-mini",
    usage: {
      prompt_tokens: 4,
      completion_tokens: 2,
    },
    latencyMs: 50,
    costUsd: formatNextRouteCost(0),
  });

  assert.match(comment, /^: x-nextroute-cache-hit=false/m);
  assert.match(comment, /^: x-nextroute-provider=openai/m);
  assert.match(comment, /^: x-nextroute-model=gpt-4o-mini/m);
  assert.match(comment, /^: x-nextroute-tokens-in=4/m);
  assert.match(comment, /^: x-nextroute-tokens-out=2/m);
  assert.match(comment, /^: x-nextroute-response-cost=0\.0000000000/m);
});
