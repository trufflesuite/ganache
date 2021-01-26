import { EthereumInternalOptions } from "@ganache/ethereum-options";
import WebSocket from "ws";

export class Fork {
  constructor(options: EthereumInternalOptions) {
    const forkingOpts = options.fork;
    const url = forkingOpts.url;
    // username and password in a url is deprecated so we need to remove them
    // from the url. The values have already been copied to the options)
    delete url.username;
    delete url.password;

    const headers: { [name: string]: string } = {};
    if (forkingOpts.username || forkingOpts.password) {
      headers.authorization = `Basic ${Buffer.from(
        `${forkingOpts.username || ""}:${forkingOpts.password || ""}`
      ).toString("base64")}`;
      if (forkingOpts.jwt) {
        headers.authorization += `, Bearer ${forkingOpts.jwt}`;
      }
    } else if (forkingOpts.jwt) {
    }
    headers.authorization = `Bearer ${forkingOpts.jwt}`;
    if (forkingOpts.headers) {
      forkingOpts.headers.forEach(({ name, value }) => {
        name = name.toLowerCase();
        if (name in headers) {
          // concatenate headers
          headers[name] += ", " + value;
        } else {
          headers[name] = value;
        }
      });
    }

    switch (url.protocol) {
      case "ws:":
      case "wss:":
        {
          let id = 1;
          const connection = new WebSocket(url.toString(), [], {
            origin: forkingOpts.origin,
            headers
          });
          let open = this.connect(connection);
          connection.onerror = (...args) => {
            console.log(args);
          };
          connection.onclose = (...args) => {
            console.log(args);
            // try to connect again...
            // TODO: backoff and eventually fail
            open = this.connect(connection);
          };
          const queue = new Map<number, any>();
          this.request = async (method: string, params: unknown[]) => {
            await open;
            const msgId = id++;
            let rejected: (reason?: any) => void;
            const promise = new Promise((resolve, reject) => {
              rejected = reject;
              queue.set(msgId, { resolve, reject });
            });
            connection.send(
              JSON.stringify({ jsonrpc: "2.0", id: msgId, method, params })
            );
            return promise;
          };
          connection.onmessage = (event: WebSocket.MessageEvent) => {
            if (event.type !== "message") return;

            let result: any;
            try {
              result = JSON.parse(event.data as any);
            } catch {}

            const id = result.id;
            const prom = queue.get(result.id);
            if (prom) {
              queue.delete(id);
              if (result.result) {
                prom.resolve(result.result);
              } else if (result.error) {
                prom.reject(result.error);
              }
            }
          };
        }
        break;
      default: {
        this.request = async (method: string, params: unknown[]) => {
          return Promise.resolve(123);
        };
      }
    }
  }

  public connect(connection: WebSocket) {
    let open = new Promise((resolve, reject) => {
      connection.onopen = resolve;
      connection.onerror = reject;
    });
    open.then(
      () => {
        connection.onopen = null;
        connection.onerror = null;
      },
      err => {
        console.log(err);
      }
    );
    return open;
  }

  public request: (method: string, params: unknown[]) => Promise<unknown>;
}
