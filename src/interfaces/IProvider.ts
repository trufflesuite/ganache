import Emittery from "emittery";
import { ILedger } from "./base-ledger";
import ProviderOptions from "../options/provider-options";

type KnownKeys<T> = {
  [K in keyof T]: string extends K ? never : number extends K ? never : K
} extends { [_ in keyof T]: infer U } ? U : never;

export interface IProvider<T extends ILedger> {
  request: (method: KnownKeys<T>, params?: any[]) => Promise<any>;
  close: () => Promise<void>;
}