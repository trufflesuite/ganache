const semver = require("semver");

// Node's assert.rejects signature doesn't match the assert.rejects signature added
// in node 10.0.0. We effectively backport the 10.0.0 method signature to ^8.13.0
// (but not to v9, as it never got an `asserts.reject`and we don't test in it anyway)
const version = process.version;
if (semver.gte(version, "8.13.0") && semver.lt(version, "9.0.0")) {
  const assert = require("assert");
  assert.rejects = ((rejects) => (asyncFn, error, message) =>
    rejects(asyncFn instanceof Promise ? () => asyncFn : asyncFn, error, message))(assert.rejects);

  assert.doesNotReject = ((doesNotReject) => (asyncFn, error, message) =>
    doesNotReject(asyncFn instanceof Promise ? () => asyncFn : asyncFn, error, message))(assert.doesNotReject);
}
