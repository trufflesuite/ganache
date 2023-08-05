export class AbortError extends Error {
  constructor() {
    super("The user aborted a request.");
  }
}
