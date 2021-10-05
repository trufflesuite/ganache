import { Request } from "../helpers";
import { Data, Quantity } from "@ganache/utils";
import { getBlockByNumber } from "../helpers";
import { Tree } from "../tree";
import { Tag } from "@ganache/ethereum-utils";
import net from "net";
import {
  decodeMessage,
  encodeMessage,
  makeIpcPath,
  Message,
  Method
} from "./helpers";

let id = 0n;

export class Client {
  private connection: net.Socket;
  private _request: Request;
  private serverId: string;
  constructor(serverId: string, request: Request) {
    this.serverId = makeIpcPath(serverId);
    this._request = request;
  }

  private registry: Map<string, any> = new Map<string, any>();

  /**
   * Sends the `message` to the server.
   * @param message
   */
  private async send(message: Message) {
    return new Promise((resolve, reject) => {
      this.connection.write(message, (err: Error) => {
        if (err) return void reject(err);
        resolve(void 0);
      });
    });
  }

  public async connect() {
    return new Promise((resolve, reject) => {
      this.connection = net.createConnection(this.serverId);
      this.connection
        .on("connect", () => {
          resolve(void 0);
        })
        .on("error", error => {
          reject(error);
        })
        .on("data", async (data: Message) => {
          const { method, id, params } = decodeMessage(data);
          switch (method) {
            case Method.response:
              const callback = this.registry.get(id.toString("hex"));
              if (callback) {
                this.registry.delete(id.toString("hex"));
                return void callback(params);
              }
              break;
            case Method.eth_getBlockByNumber:
              const [number] = JSON.parse(params as Buffer);
              const block = await this.getBlockByNumber(
                number === Tag.EARLIEST ? Tag.EARLIEST : Quantity.from(number)
              );
              const message = encodeMessage(
                Method.response,
                id,
                block
                  ? [
                      Data.from(block.hash).toBuffer(),
                      Quantity.from(block.number).toBuffer()
                    ]
                  : null
              );
              await this.send(message);
              break;
          }
        });
    });
  }

  public async disconnect() {
    return new Promise(resolve => {
      this.connection.end(() => {
        resolve(void 0);
      });
    });
  }

  async request(method: Method, params: any) {
    id++;
    const localId = Buffer.from("client-" + id, "utf8");
    return new Promise<any>(resolve => {
      this.registry.set(localId.toString("hex"), resolve);
      this.connection.write(encodeMessage(method, localId, params));
    });
  }

  public async resolveTargetAndClosestAncestor(
    targetHeight: Quantity,
    targetHash: Data
  ) {
    const result = await this.request(Method.resolveTargetAndClosestAncestor, [
      targetHeight.toBuffer(),
      targetHash.toBuffer()
    ]);
    const [key1, closestAncestorS, key2, targetBlockS] = result;
    const closestAncestor = Tree.deserialize(key1, closestAncestorS);
    const targetBlock = Tree.deserialize(key2, targetBlockS);
    return {
      closestAncestor,
      targetBlock
    };
  }
  findRelated() {}
  findClosestAncestor() {}
  findClosestDescendants() {}
  async getBlockByNumber(number: Quantity | Tag) {
    return await getBlockByNumber(this._request, number);
  }
}
