import { Api } from "./api";

export interface Provider<ApiImplementation extends Api> {
  getOptions(): any;
  getInitialAccounts(): any;
}
