import {
  ADMIN_USERNAME_KEY,
  ADMIN_PASSWORD_KEY,
  RESPONSE_AUTH_ERROR,
  RESPONSE_BASIC_LOGIN,
  EXCEPTION_UNAUTHORIZED,
  EXCEPTION_BAD_REQUEST,
} from "../../constants";

export async function authenticateRequest(request, route) {
  if (requestIncludesAuthHeader(request)) {
    try {
      await loginUser(request);
      return route;
    } catch (e) {
      return new Response("Authentication Error", RESPONSE_AUTH_ERROR);
    }
  }
  return authenticationRedirectResponse();
}

async function loginUser(request) {
  const { user, pass } = getCredentialsFromRequest(request);
  await verifyRequestCredentials(user, pass);
}

function requestIncludesAuthHeader(request) {
  return request.headers.has("Authorization");
}

function getCredentialsFromRequest(request) {
  const encoded = getEncodedCredentials(request.headers.get("Authorization"));
  const { user, pass } = decodeEncodedCredentials(encoded);

  return {
    user,
    pass,
  };
}

function getEncodedCredentials(header) {
  const authenticationScheme = "Basic";
  const [scheme, encoded] = header.split(" ");

  if (!encoded || scheme !== authenticationScheme) {
    throw new EXCEPTION_BAD_REQUEST("Malformed authorization header.");
  }

  return encoded;
}

function decodeEncodedCredentials(encoded) {
  const buffer = Uint8Array.from(atob(encoded), (character) =>
    character.charCodeAt(0)
  );
  const decoded = new TextDecoder().decode(buffer).normalize();
  const index = decoded.indexOf(":");

  if (index === -1 || /[\0-\x1F\x7F]/.test(decoded)) {
    throw new EXCEPTION_BAD_REQUEST("Invalid authorization value.");
  }
  return {
    user: decoded.substring(0, index),
    pass: decoded.substring(index + 1),
  };
}

async function verifyRequestCredentials(user, pass) {
  const ADMIN_USER = await ADMIN_KV.get(ADMIN_USERNAME_KEY);
  const ADMIN_PASS = await ADMIN_KV.get(ADMIN_PASSWORD_KEY);

  if (ADMIN_USER !== user) {
    throw new EXCEPTION_UNAUTHORIZED("Invalid username.");
  }

  if (ADMIN_PASS !== pass) {
    throw new EXCEPTION_UNAUTHORIZED("Invalid password.");
  }
}

function authenticationRedirectResponse() {
  return new Response("You need to login.", RESPONSE_BASIC_LOGIN);
}
