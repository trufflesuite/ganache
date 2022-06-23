import { EPOCH, RESPONSE_CACHE_ONE_YEAR } from "../../constants";

export async function epochRoute() {
  return new Response(EPOCH, RESPONSE_CACHE_ONE_YEAR);
}
