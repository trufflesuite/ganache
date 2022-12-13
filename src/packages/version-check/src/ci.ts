/**
 * Detects common env variables set by CI environments.
 *
 * Disabled by setting the IGNORE_ISCI env var.
 *
 * TRUFFLE_SHUFFLE_TEST is used for unit testing.
 *
 * @returns boolean
 */
export function isCI(): boolean {
  return process.env["IGNORE_ISCI"]
    ? false
    : !!(
        process.env["APPVEYOR"] ||
        process.env["BITBUCKET_BUILD_NUMBER"] ||
        process.env["BITBUCKET_DEPLOYMENT"] ||
        process.env["BITRISE_IO"] ||
        process.env["BUDDY_WORKSPACE_ID"] ||
        process.env["BUILDER_OUTPUT"] ||
        process.env["BUILDKITE"] ||
        process.env["BUILDKITE"] ||
        process.env["BUILD_NUMBER"] ||
        process.env["CI"] ||
        process.env["CIRCLECI"] ||
        process.env["CIRRUS_CI"] ||
        process.env["CI_NAME"] ||
        process.env["CODEBUILD_SRC_DIR"] ||
        process.env["CONTINUOUS_INTEGRATION"] ||
        process.env["DRONE"] ||
        process.env["DSARI"] ||
        process.env["GERRIT_PROJECT"] ||
        process.env["GITHUB_ACTION"] ||
        process.env["GITLAB_CI"] ||
        process.env["GITLAB_DEPLOYMENT"] ||
        process.env["GO_PIPELINE_NAME"] ||
        process.env["HUDSON_URL"] ||
        process.env["JENKINS_URL"] ||
        process.env["MAGNUM"] ||
        process.env["NETLIFY"] ||
        process.env["NEVERCODE"] ||
        process.env["NOW_BUILDER"] ||
        process.env["NOW_GITHUB_DEPLOYMENT"] ||
        process.env["RENDER"] ||
        process.env["SAIL_CI"] ||
        process.env["SCREWDRIVER"] ||
        process.env["SEMAPHORE"] ||
        process.env["SHIPPABLE"] ||
        process.env["STRIDER"] ||
        process.env["SYSTEM_TEAMFOUNDATIONCOLLECTIONURI"] ||
        process.env["TASKCLUSTER_ROOT_URL"] ||
        process.env["TDDIUM"] ||
        process.env["TEAMCITY_VERSION"] ||
        process.env["TF_BUILD"] ||
        process.env["TRAVIS"] ||
        process.env["VERCEL_BITBUCKET_DEPLOYMENT"] ||
        process.env["VERCEL_GITHUB_DEPLOYMENT"] ||
        process.env["VERCEL_URL"] ||
        process.env["WERCKER"] ||
        process.env["TRUFFLE_SHUFFLE_TEST"]
      );
}
