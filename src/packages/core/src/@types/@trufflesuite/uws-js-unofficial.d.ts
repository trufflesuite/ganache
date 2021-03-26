import "@trufflesuite/uws-js-unofficial";

enum ListenOptions {
  LIBUS_LISTEN_DEFAULT = 0,
  LIBUS_LISTEN_EXCLUSIVE_PORT = 1
}
// uWebSockets.js doesn't include these in its TS def file.
declare module "@trufflesuite/uws-js-unofficial" {
  export interface TemplatedApp {
    listen(
      host: RecognizedString,
      port: number,
      options: ListenOptions,
      cb: (listenSocket: us_listen_socket | false) => void
    ): TemplatedApp;

    listen(
      port: number,
      options: ListenOptions,
      cb: (listenSocket: us_listen_socket | false) => void
    ): TemplatedApp;
  }
}
