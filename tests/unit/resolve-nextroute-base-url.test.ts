import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_NEXTROUTE_BASE_URL,
  resolveNextRouteBaseUrl,
} from "../../src/shared/utils/resolveNextRouteBaseUrl.ts";

test("resolveNextRouteBaseUrl prefers NEXTROUTE_BASE_URL", () => {
  assert.equal(
    resolveNextRouteBaseUrl({
      NEXTROUTE_BASE_URL: "https://internal.example.com/",
      BASE_URL: "https://base.example.com",
      NEXT_PUBLIC_BASE_URL: "https://public.example.com",
    }),
    "https://internal.example.com"
  );
});

test("resolveNextRouteBaseUrl falls back to BASE_URL", () => {
  assert.equal(
    resolveNextRouteBaseUrl({
      BASE_URL: "https://base.example.com/",
      NEXT_PUBLIC_BASE_URL: "https://public.example.com",
    }),
    "https://base.example.com"
  );
});

test("resolveNextRouteBaseUrl falls back to NEXT_PUBLIC_BASE_URL", () => {
  assert.equal(
    resolveNextRouteBaseUrl({
      NEXT_PUBLIC_BASE_URL: "https://public.example.com/",
    }),
    "https://public.example.com"
  );
});

test("resolveNextRouteBaseUrl ignores blank values", () => {
  assert.equal(
    resolveNextRouteBaseUrl({
      NEXTROUTE_BASE_URL: "   ",
      BASE_URL: "",
      NEXT_PUBLIC_BASE_URL: " https://public.example.com/ ",
    }),
    "https://public.example.com"
  );
});

test("resolveNextRouteBaseUrl uses the default localhost fallback", () => {
  assert.equal(resolveNextRouteBaseUrl({}), DEFAULT_NEXTROUTE_BASE_URL);
});
