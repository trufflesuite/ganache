import { decode, encode } from "@ganache/rlp";
import { join } from "path";

export enum Method {
  response = 0,
  resolveTargetAndClosestAncestor = 1,
  eth_getBlockByNumber = 2
}
export type Param = Buffer | Buffer[] | Param[];
export type Params = Param | null;
export type Id = Buffer;
export type Payload = [Id, Params];
export type Message = Buffer & { 0: Method };

export function makeIpcPath(serverId: string) {
  if (process.platform === "win32") {
    return join("\\\\.\\pipe\\", serverId + ".sock");
  } else {
    return join("/tmp/", serverId + ".sock");
  }
}

export function encodeMessage(method: Method, id: Id, params: Params): Message {
  const payload = params ? [id, params] : [id];
  return Buffer.concat([Buffer.from([method]), encode(payload)]) as any;
}
export function decodeMessage(message: Message) {
  const method = message[0];
  const [id, params] = (decode(message.slice(1)) as any) as Payload;
  return { method, id, params: params == null ? null : params };
}
