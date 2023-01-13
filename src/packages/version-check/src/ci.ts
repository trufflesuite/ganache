/**
 * Detects common env variables set by CI environments.
 *
 * Disabled by setting the IGNORE_ISCI env var.
 *
 * TRUFFLE_SHUFFLE_TEST is used for unit testing.
 *
 * @returns boolean
 */
export function isCI(env: NodeJS.ProcessEnv = process.env): boolean {
  return env["IGNORE_ISCI"]
    ? false
    : !!(
        env["APPVEYOR"] ||
        env["BITBUCKET_BUILD_NUMBER"] ||
        env["BITBUCKET_DEPLOYMENT"] ||
        env["BITRISE_IO"] ||
        env["BUDDY_WORKSPACE_ID"] ||
        env["BUILDER_OUTPUT"] ||
        env["BUILDKITE"] ||
        env["BUILDKITE"] ||
        env["BUILD_NUMBER"] ||
        env["CI"] ||
        env["CIRCLECI"] ||
        env["CIRRUS_CI"] ||
        env["CI_NAME"] ||
        env["CODEBUILD_SRC_DIR"] ||
        env["CONTINUOUS_INTEGRATION"] ||
        env["DRONE"] ||
        env["DSARI"] ||
        env["GERRIT_PROJECT"] ||
        env["GITHUB_ACTION"] ||
        env["GITLAB_CI"] ||
        env["GITLAB_DEPLOYMENT"] ||
        env["GO_PIPELINE_NAME"] ||
        env["HUDSON_URL"] ||
        env["JENKINS_URL"] ||
        env["MAGNUM"] ||
        env["NETLIFY"] ||
        env["NEVERCODE"] ||
        env["NOW_BUILDER"] ||
        env["NOW_GITHUB_DEPLOYMENT"] ||
        env["RENDER"] ||
        env["SAIL_CI"] ||
        env["SCREWDRIVER"] ||
        env["SEMAPHORE"] ||
        env["SHIPPABLE"] ||
        env["STRIDER"] ||
        env["SYSTEM_TEAMFOUNDATIONCOLLECTIONURI"] ||
        env["TASKCLUSTER_ROOT_URL"] ||
        env["TDDIUM"] ||
        env["TEAMCITY_VERSION"] ||
        env["TF_BUILD"] ||
        env["TRAVIS"] ||
        env["VERCEL_BITBUCKET_DEPLOYMENT"] ||
        env["VERCEL_GITHUB_DEPLOYMENT"] ||
        env["VERCEL_URL"] ||
        env["WERCKER"] ||
        env["TRUFFLE_SHUFFLE_TEST"]
      );
}
