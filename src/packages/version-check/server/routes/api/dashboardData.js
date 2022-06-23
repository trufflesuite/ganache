import { RESPONSE_JSON_NOCACHE } from "../../constants";

export async function dashboardData() {
  const rawData = await VERSION_KV.list();

  const data = rawData.keys.map((key) => {
    const [name, ip, timestamp] = key.name.split("|");
    return {
      name,
      timestamp,
    };
  }, {});
  return new Response(JSON.stringify(data, null, 2), RESPONSE_JSON_NOCACHE);
}
