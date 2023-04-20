function skipIfNoInfuraKey() {
  before("skip if no INFURA_KEY (unless in CI)", function () {
    // If there is no INFURA_KEY provided, the test should be skipped. Unless running
    // in CI, where there should _always_ be a key provided.
    if (!process.env.INFURA_KEY) {
      if (process.env.CI === "true") {
        throw new Error(
          `No INFURA_KEY environment variable was provided. When process.env.CI is "true", an INFURA_KEY must be provided.`
        );
      } else {
        this.skip();
      }
    }
  });
}

export default skipIfNoInfuraKey;
