export const RESPONSE_BAD_REQUEST = {
  status: 400,
  statusText: "Bad Request",
};

export const RESPONSE_INTERNAL_SERVER_ERROR = {
  status: 500,
  statusText: "Internal Server Error",
};

export const RESPONSE_AUTH_ERROR = {
  status: 401,
};

export const RESPONSE_CACHE_300 = {
  status: 200,
  headers: {
    "Cache-Control": "max-age=300, s-maxage=300",
  },
};

export const RESPONSE_COMPRESS_HTML_NOCACHE = {
  status: 200,
  headers: {
    "Content-Encoding": "gzip",
    "Content-Type": "text/html",
    "Cache-Control": "no-store",
  },
};

export const RESPONSE_CACHE_ONE_YEAR = {
  "Cache-Control": "max-age=31536000, s-maxage=31536000",
};

export const RESPONSE_JSON_NOCACHE = {
  status: 200,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  },
};

export const RESPONSE_BASIC_LOGIN = {
  status: 401,
  headers: {
    // Prompts the user for credentials.
    "WWW-Authenticate": 'Basic realm="my scope", charset="UTF-8"',
  },
};
