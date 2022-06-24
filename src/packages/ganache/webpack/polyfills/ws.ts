// We use the Node.js `ws` module on the Node.js side but it doesn't work in the
// browser, so we need to export the browser `WebSocket` for the browser.
import type { URL } from "url";

export default class WebSocket {
  // the browser `WebSocket` class has a second parameter, `protocols`, which is
  // incompatible with the `ws` module's second parameter, `options`.
  constructor(url: string | URL, options?: { protocol?: string | undefined }) {
    return new globalThis.WebSocket(
      url,
      options ? options.protocol : undefined
    );
  }
}
