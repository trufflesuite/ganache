declare module "ganache" {
  type Callback = (err: Error | null) => void;

  export interface RequestArguments {
    readonly method: string;
    readonly params?: readonly unknown[] | object;
  }

  export interface ProviderMessage {
    readonly type: string;
    readonly data: unknown;
  }

  export type Provider = {
    request(args: RequestArguments): Promise<unknown>;

    on(
      eventName: string,
      listener: (message: ProviderMessage) => void
    ): Provider;

    removeListener(
      eventName: string,
      listener: (message: ProviderMessage) => void
    ): Provider;

    disconnect: Promise<void>;
  };

  export type Server = {
    provider: Provider;

    listen(port: number): Promise<void>;
    listen(port: number, host: string): Promise<void>;
    listen(port: number, callback: Callback): void;
    listen(port: number, host: string, callback: Callback): void;

    close(): Promise<void>;
  };

  export const provider: (options?: any) => Provider;
  export const server: (
    options?: any
  ) => {
    provider: (options?: any) => Provider;
  };
  const Ganache: {
    provider: (options?: any) => Provider;
    server: (options?: any) => Server;
  };

  export default Ganache;
}
