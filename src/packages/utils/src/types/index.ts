export * from "./connector";
export * from "./provider";
export * from "./api";
export * from "./url";

import { Api } from "./api";

export type KnownKeys<T> = {
  [K in keyof T]: string extends K ? never : number extends K ? never : K;
} extends { [_ in keyof T]: infer U }
  ? U
  : never;

export type RequestType<T extends Api = Api> = (eventDetails: {
  api: T;
  method: KnownKeys<T>;
  params?: Parameters<T[keyof T]>;
}) => ReturnType<T[keyof T]>;

declare global {
  interface JSON {
    parse(text: Buffer, reviver?: (key: any, value: any) => any): any;
  }
}
