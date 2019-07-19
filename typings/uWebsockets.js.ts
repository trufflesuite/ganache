import "uWebSockets.js"

enum ListenOptions {
    LIBUS_LISTEN_DEFAULT = 0,
    LIBUS_LISTEN_EXCLUSIVE_PORT = 1
}
// uWebSockets.js doesn't include these in its TS def file.
declare module "uWebSockets.js" {
    export const DISABLED:number;
    export const SHARED_COMPRESSOR:number;
    export const DEDICATED_COMPRESSOR:number;

    export interface TemplatedApp {
        listen(port: number, options: ListenOptions, cb: (listenSocket: any) => void): TemplatedApp;
    }
}
