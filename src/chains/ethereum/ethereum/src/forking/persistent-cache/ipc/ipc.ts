import { Client } from "./client";
import { Server } from "./server";
import { Request } from "../helpers";

const IPC_ID = "ganache-persistence";

export async function initialize(request: Request) {
  const start = Date.now();
  await Server.spawnInDisconnectedProcess(IPC_ID);
  // const s = new Server(IPC_ID);
  // await s.initialize();
  const client = new Client(IPC_ID, request);
  await client.connect();
  console.log(Date.now() - start);
  return client;
}
