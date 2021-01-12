import "ethereumjs-util";

declare module "ethereumjs-util" {
  export declare const publicToAddress: (
    pubKey: Buffer,
    sanitize?: boolean
  ) => Buffer;
}
