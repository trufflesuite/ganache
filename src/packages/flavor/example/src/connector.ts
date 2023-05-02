import type { Connector, HttpRequest } from "@ganache/flavor";
import { NotABlockchainChainProviderOptions } from "./options";
import { Provider } from "./provider";

export type RequestFormat = {
  id: string | number;
  method: string;
  params: any[];
};

export type ResponseFormat = {
  id: string | number;
  method: string;
  params: any[];
};

export class NotABlockchainChainConnector
  implements Connector<Provider, RequestFormat, ResponseFormat>
{
  public provider: Provider;
  constructor(options: NotABlockchainChainProviderOptions) {
    this.provider = new Provider(options);
  }
  public async connect() {}
  public parse(message: Buffer): RequestFormat {
    return JSON.parse(message);
  }
  public async handle(payload: RequestFormat, _connection: HttpRequest) {
    const value = this.provider.send(payload.method, payload.params);
    return { value };
  }
  public format(result: any, { id }: RequestFormat) {
    return JSON.stringify({
      id,
      result
    });
  }
  public formatError({ message }: Error, { id }: RequestFormat) {
    return JSON.stringify({
      id,
      error: {
        message
      }
    });
  }
  public close() {}
}
