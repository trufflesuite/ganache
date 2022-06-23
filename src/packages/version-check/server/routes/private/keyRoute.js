import { RESPONSE_JSON_NOCACHE } from "../../constants";

export async function keyRoute(request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  const value = await VERSION_KV.get(key);
  return new Response(value, RESPONSE_JSON_NOCACHE);
}
