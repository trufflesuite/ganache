import { RESPONSE_JSON_NOCACHE } from "../../constants";

export async function keysRoute() {
  const value = await VERSION_KV.list();
  return new Response(JSON.stringify(value.keys), RESPONSE_JSON_NOCACHE);
}
