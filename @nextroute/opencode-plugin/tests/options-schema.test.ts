/**
 * T-08 options-schema tests.
 *
 * Covers `parseNextRoutePluginOptions(opts)` — the strict Zod gate that
 * validates the second-arg `PluginOptions` bag from opencode.json before
 * any hook is wired. Anti-pattern checklist mirrored here:
 *
 *  - `null` / `undefined` must collapse to `{}` (defaults apply downstream).
 *  - Unknown keys must THROW (`.strict()` catches opencode.json typos).
 *  - Validation runs at parse time, not import time (module loads cleanly).
 */

import test from "node:test";
import assert from "node:assert/strict";
import { parseNextRoutePluginOptions } from "../src/index.js";

test("parseNextRoutePluginOptions: undefined → {}", () => {
  assert.deepEqual(parseNextRoutePluginOptions(undefined), {});
});

test("parseNextRoutePluginOptions: null → {}", () => {
  assert.deepEqual(parseNextRoutePluginOptions(null), {});
});

test("parseNextRoutePluginOptions: empty object → {}", () => {
  assert.deepEqual(parseNextRoutePluginOptions({}), {});
});

test("parseNextRoutePluginOptions: valid providerId → returns it", () => {
  const r = parseNextRoutePluginOptions({ providerId: "nextroute-preprod" });
  assert.equal(r.providerId, "nextroute-preprod");
});

test("parseNextRoutePluginOptions: invalid providerId (special chars) → throws", () => {
  assert.throws(
    () => parseNextRoutePluginOptions({ providerId: "nextroute prod!" }),
    /providerId.*slug/i
  );
});

test("parseNextRoutePluginOptions: empty providerId → throws", () => {
  assert.throws(() => parseNextRoutePluginOptions({ providerId: "" }), /providerId/i);
});

test("parseNextRoutePluginOptions: valid modelCacheTtl → returns it", () => {
  const r = parseNextRoutePluginOptions({ modelCacheTtl: 60_000 });
  assert.equal(r.modelCacheTtl, 60_000);
});

test("parseNextRoutePluginOptions: negative modelCacheTtl → throws", () => {
  assert.throws(() => parseNextRoutePluginOptions({ modelCacheTtl: -1 }), /modelCacheTtl/i);
});

test("parseNextRoutePluginOptions: zero modelCacheTtl → throws (positive required)", () => {
  assert.throws(() => parseNextRoutePluginOptions({ modelCacheTtl: 0 }), /modelCacheTtl/i);
});

test("parseNextRoutePluginOptions: invalid baseURL (not a URL) → throws", () => {
  assert.throws(() => parseNextRoutePluginOptions({ baseURL: "not-a-url" }), /baseURL/i);
});

test("parseNextRoutePluginOptions: unknown key → throws (strict mode catches typos)", () => {
  assert.throws(
    () =>
      parseNextRoutePluginOptions({
        providerId: "nextroute",
        provider_id: "typo-here",
      }),
    /provider_id|unrecognized/i
  );
});

test("parseNextRoutePluginOptions: all four fields populated correctly → returns them", () => {
  const opts = {
    providerId: "nextroute-prod",
    displayName: "NextRoute Production",
    modelCacheTtl: 120_000,
    baseURL: "https://or.example.com/v1",
  };
  const r = parseNextRoutePluginOptions(opts);
  assert.deepEqual(r, opts);
});

test("parseNextRoutePluginOptions: error message lists every issue path", () => {
  // Two bad fields at once → error string should mention BOTH.
  try {
    parseNextRoutePluginOptions({
      providerId: "",
      baseURL: "garbage",
    });
    assert.fail("expected throw");
  } catch (err) {
    const msg = (err as Error).message;
    assert.match(msg, /providerId/);
    assert.match(msg, /baseURL/);
  }
});

test("parseNextRoutePluginOptions: module import alone does NOT throw", async () => {
  // Re-importing the entry must not trigger validation; validation only fires
  // on explicit parseNextRoutePluginOptions / NextRoutePlugin invocation.
  const mod = await import("../src/index.js");
  assert.equal(typeof mod.parseNextRoutePluginOptions, "function");
});
