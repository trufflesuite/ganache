export const envVars = [
  "APPVEYOR",
  "BITBUCKET_BUILD_NUMBER",
  "BITBUCKET_DEPLOYMENT",
  "BITRISE_IO",
  "BUDDY_WORKSPACE_ID",
  "BUILDER_OUTPUT",
  "BUILDKITE",
  "BUILDKITE",
  "BUILD_NUMBER",
  "CI",
  "CIRCLECI",
  "CIRRUS_CI",
  "CI_NAME",
  "CODEBUILD_SRC_DIR",
  "CONTINUOUS_INTEGRATION",
  "DRONE",
  "DSARI",
  "GERRIT_PROJECT",
  "GITHUB_ACTION",
  "GITLAB_CI",
  "GITLAB_DEPLOYMENT",
  "GO_PIPELINE_NAME",
  "HUDSON_URL",
  "HUDSON_URL",
  "JENKINS_URL",
  "JENKINS_URL",
  "MAGNUM",
  "NETLIFY",
  "NEVERCODE",
  "NOW_BUILDER",
  "NOW_GITHUB_DEPLOYMENT",
  "RENDER",
  "SAIL_CI",
  "SCREWDRIVER",
  "SEMAPHORE",
  "SHIPPABLE",
  "STRIDER",
  "SYSTEM_TEAMFOUNDATIONCOLLECTIONURI",
  "TASKCLUSTER_ROOT_URL",
  "TDDIUM",
  "TEAMCITY_VERSION",
  "TEAMCITY_VERSION",
  "TF_BUILD",
  "TRAVIS",
  "VERCEL_BITBUCKET_DEPLOYMENT",
  "VERCEL_GITHUB_DEPLOYMENT",
  "VERCEL_URL",
  "WERCKER",
  "TRUFFLE_SHUFFLE_TEST"
];

export function detectCI() {
  let currentEnvVar = 0;

  while (currentEnvVar < envVars.length) {
    const current = envVars[currentEnvVar];
    if (!!process.env[current]) {
      return true;
    }

    currentEnvVar++;
  }

  return false;
}
