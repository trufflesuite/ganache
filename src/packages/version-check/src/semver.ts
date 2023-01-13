import { default as semverDiff } from "semver/functions/diff";
import { default as semverValid } from "semver/functions/valid";
import { default as semverGte } from "semver/functions/gte";

import { ReleaseType } from "semver";

export { default as semverGte } from "semver/functions/gte";
export { default as semverClean } from "semver/functions/clean";

export function semverIsValid(semver: string): string {
  return semverValid(semver);
}

export function semverUpgradeType(
  currentVersion: string,
  latestVersion: string
): ReleaseType | null {
  if (semverGte(currentVersion, latestVersion)) return null;

  return semverDiff(currentVersion, latestVersion);
}
