// We use node's built-in `URL` module on the Node.js side but this is already
// available in the browser, so we just need to export it so webpack can
// resolve it.

// my magnum opus:
export const URL = globalThis.URL;
