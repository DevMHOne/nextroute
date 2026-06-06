/**
 * Helper used by the `NEXTROUTE_BUILD_PROFILE=minimal` stubs to surface a
 * consistent "this feature was compiled out" error. Routes that depend on a
 * stubbed module should catch the error and return HTTP 503 with a clear
 * message; we don't want the bundle to silently fail.
 *
 * See docs/security/SOCKET_DEV_FINDINGS.md for the build profile rationale.
 */
export class FeatureDisabledError extends Error {
  readonly featureName: string;
  constructor(featureName: string) {
    super(
      `Feature "${featureName}" is disabled in this build (NEXTROUTE_BUILD_PROFILE=minimal). ` +
        `Install the full nextroute artifact instead of nextroute-secure if you need this feature.`
    );
    this.name = "FeatureDisabledError";
    this.featureName = featureName;
  }
}

export function featureDisabledError(featureName: string): FeatureDisabledError {
  return new FeatureDisabledError(featureName);
}

export const NEXTROUTE_BUILD_PROFILE: string = process.env.NEXTROUTE_BUILD_PROFILE || "full";
export const IS_MINIMAL_BUILD: boolean = NEXTROUTE_BUILD_PROFILE === "minimal";
