import { buf2hex } from "../../util";
import {
  EPOCH,
  SALT,
  RESPONSE_BAD_REQUEST,
  RESPONSE_CACHE_300,
  RESPONSE_INTERNAL_SERVER_ERROR,
  EXCEPTION_BAD_REQUEST,
} from "../../constants";

export async function packageVersionRoute(request, event) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");
  const knownPackages = ["ganache", "truffle"];
  const cache = caches.default;
  const cacheKey = request.url.toString();

  // If the package is not ganache or truffle, eject!
  if (knownPackages.indexOf(name) === -1) {
    return new Response(
      "400 Bad Request - Missing or invalid 'name' param",
      RESPONSE_BAD_REQUEST
    );
  }

  // URL hit counter
  await trackRequestAnalytics(request, name);

  // This will not work in dev, because Cloudflare edge caching.
  // Cache survives for 2 hours on the free plan. A-OK for us.
  const cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) {
    console.log(`Cache hit for: ${request.url}.`);
    return cachedResponse;
  }

  console.log(
    `Response for request url: ${request.url} not present in cache. Fetching and caching request.`
  );

  // Kick it over to npm to grab the latest package version
  try {
    const version = await getPackageVersion(name);
    const response = new Response(version, RESPONSE_CACHE_300);

    // Cache the response
    event.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (e) {
    console.error(e);
  }
  return new Response(
    "500 Internal Server Error",
    RESPONSE_INTERNAL_SERVER_ERROR
  );
}

async function trackRequestAnalytics(request, name) {
  const key = await createKey(request.headers.get("CF-Connecting-IP"), name);
  const value = createValue(request);
  VERSION_KV.put(key, value);
}

async function createKey(ip, name) {
  const textEncodedIp = new TextEncoder("utf-8").encode(ip + SALT);
  const hashedIp = await crypto.subtle.digest("SHA-256", textEncodedIp);
  // we subtract our EPOCH from the current timestamp to save some space
  // store data in the key format of `name|ip|timestamp`. this lets us filter by package+ip more easily.
  return `${name}|${buf2hex(hashedIp)}|${Date.now() - EPOCH}`;
}

function createValue(request) {
  return JSON.stringify({
    "User-Agent": request.headers.get("User-Agent"),
    cf: request.cf,
  });
}

async function getPackageVersion(name) {
  const registryUrl = `https://registry.npmjs.org/${name}`;
  const res = await fetch(registryUrl);
  const data = await res.json();

  if (typeof data === "object" && "dist-tags" in data) {
    const distTags = data["dist-tags"];
    if (
      typeof distTags === "object" &&
      "latest" in distTags &&
      typeof distTags.latest === "string" &&
      distTags.latest !== ""
    ) {
      return distTags.latest;
    }
  }
  throw new EXCEPTION_BAD_REQUEST(
    "Registry URL did not return valid package version."
  );
}
