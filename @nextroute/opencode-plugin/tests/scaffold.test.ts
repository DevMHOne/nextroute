import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
  NextRoutePlugin,
  NEXTROUTE_PROVIDER_KEY,
  DEFAULT_MODEL_CACHE_TTL_MS,
  resolveNextRoutePluginOptions,
} from "../src/index.js";

test("scaffold: exports public surface", () => {
  assert.equal(
    typeof NextRoutePlugin,
    "function",
    "NextRoutePlugin must be a function (Plugin factory)"
  );
  assert.equal(NEXTROUTE_PROVIDER_KEY, "nextroute");
  assert.equal(DEFAULT_MODEL_CACHE_TTL_MS, 300_000);
});

test("scaffold: default export is v1 plugin shape { id, server: NextRoutePlugin }", async () => {
  const mod = await import("../src/index.js");
  assert.equal(typeof mod.default, "object");
  assert.equal(mod.default.id, "@nextroute/opencode-plugin");
  assert.equal(mod.default.server, mod.NextRoutePlugin);
});

test("resolveNextRoutePluginOptions: defaults", () => {
  const r = resolveNextRoutePluginOptions();
  assert.equal(r.providerId, "nextroute");
  assert.equal(r.displayName, "NextRoute");
  assert.equal(r.modelCacheTtl, 300_000);
  assert.equal(r.baseURL, undefined);
});

test("resolveNextRoutePluginOptions: custom providerId derives displayName", () => {
  const r = resolveNextRoutePluginOptions({ providerId: "nextroute-preprod" });
  assert.equal(r.providerId, "nextroute-preprod");
  assert.equal(r.displayName, "NextRoute (nextroute-preprod)");
});

test("resolveNextRoutePluginOptions: explicit displayName wins", () => {
  const r = resolveNextRoutePluginOptions({
    providerId: "nextroute-x",
    displayName: "Custom Label",
  });
  assert.equal(r.displayName, "Custom Label");
});

test("resolveNextRoutePluginOptions: invalid TTL falls back to default", () => {
  assert.equal(resolveNextRoutePluginOptions({ modelCacheTtl: 0 }).modelCacheTtl, 300_000);
  assert.equal(resolveNextRoutePluginOptions({ modelCacheTtl: -1 }).modelCacheTtl, 300_000);
});

test("resolveNextRoutePluginOptions: positive TTL respected", () => {
  assert.equal(resolveNextRoutePluginOptions({ modelCacheTtl: 60_000 }).modelCacheTtl, 60_000);
});

test("NextRoutePlugin: returns an empty hooks object (scaffold)", async () => {
  const fakeCtx = {} as Parameters<typeof NextRoutePlugin>[0];
  const hooks = await NextRoutePlugin(fakeCtx);
  assert.equal(typeof hooks, "object");
  assert.notEqual(hooks, null);
});

test("scaffold: CJS default export resolves via require() with v1 shape", () => {
  const require_ = createRequire(import.meta.url);
  const cjs = require_("../dist/index.cjs");
  // after cjsInterop:true, default export is on cjs.default
  assert.strictEqual(typeof cjs.default, "object");
  assert.strictEqual(cjs.default.id, "@nextroute/opencode-plugin");
  assert.strictEqual(typeof cjs.default.server, "function");
});
