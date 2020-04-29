import Api from "../interfaces/api";

export type KnownKeys<T> = {
  [K in keyof T]: string extends K ? never : number extends K ? never : K;
} extends {[_ in keyof T]: infer U}
  ? U
  : never;

export type RequestType<T extends Api = Api> = (eventDetails: {
  api: T;
  method: KnownKeys<T>;
  params?: Parameters<T[keyof T]>;
}) => ReturnType<T[keyof T]>;
