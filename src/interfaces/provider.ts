import Api from "./api";

type KnownKeys<T> = {
  [K in keyof T]: string extends K ? never : number extends K ? never : K;
} extends {[_ in keyof T]: infer U}
  ? U
  : never;

export interface Provider<T extends Api> {
  request: (method: KnownKeys<T>, params?: any[]) => Promise<any>;
  close: () => Promise<void>;
}
