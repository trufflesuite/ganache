import type { LevelUp } from "levelup";

export function getBlockNumberFromParams(method: string, params: any[]) {
  // get the request's block number
  switch (method) {
    case "eth_getBlockByNumber":
      return params[0];
    case "eth_getTransactionCount":
    case "eth_getCode":
    case "eth_getBalance":
      return params[1];
    case "eth_getStorageAt":
      return params[2];
    default:
      throw new Error(`Persistent cache does not support calls to "${method}.`);
  }
}

export async function setDbVersion(db: LevelUp, version: Buffer) {
  // set the version if the DB was just created, or error if we already have
  // a version, but it isn't what we expected
  try {
    const version = await db.get("version");
    if (!version.equals(version)) {
      // in the future this is where database migrations would go
      throw new Error(
        `Persistent cache version "${version.toString()}"" is not understood.`
      );
    }
  } catch (e) {
    if (!e.notFound) throw e;

    // if we didn't have a `version` key we need to set one
    await db.put("version", version);
  }
}
