import "uWebSockets.js"

// uWebSockets.js doesn't haveinclude these in it's TS def file.

declare module "uWebSockets.js" {
    export const DISABLED:number;
    export const SHARED_COMPRESSOR:number;
    export const DEDICATED_COMPRESSOR:number;
}
