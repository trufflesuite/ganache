import { default as semverDiff } from "semver/functions/diff";
import { default as semverValid } from "semver/functions/valid";
import { default as semverGte } from "semver/functions/gte";

export function isValidSemver(semver: string) {
  return semverValid(semver);
}

export function semverUpgradeType(a: string, b: string) {
  if (!a || !b || semverGte(a, b)) return null;

  return semverDiff(a, b);
}
