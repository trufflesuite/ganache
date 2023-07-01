import {
  TemplatedApp,
  HttpResponse,
  HttpRequest,
  RecognizedString
} from "@trufflesuite/uws-js-unofficial";
import ContentTypes from "./utils/content-types";
import HttpResponseCodes from "./utils/http-response-codes";
import type { Connector } from "@ganache/flavor";
import { InternalServerOptions } from "../types";
import { types } from "util";
import { getFragmentGenerator } from "./utils/fragment-generator";

type HttpMethods = "GET" | "OPTIONS" | "POST";

const noop = () => {};

/**
 * uWS doesn't let us use the request after the request method has completed.
 * But we can't set headers until after the statusCode is set. But we don't
 * know the status code until the provider returns asynchronously.
 * So this does request-related work immediately and returns a function to do the
 * rest of the work later.
 * @param method -
 * @param request -
 */
function prepareCORSResponseHeaders(method: HttpMethods, request: HttpRequest) {
  // https://fetch.spec.whatwg.org/#http-requests
  const origin = request.getHeader("origin");
  const acrh = request.getHeader("access-control-request-headers");
  return (response: HttpResponse) => {
    const isCORSRequest = origin !== "";
    if (isCORSRequest) {
      // OPTIONS preflight requests need a little extra treatment
      if (method === "OPTIONS") {
        // we only allow POST requests, so it doesn't matter which method the request is asking for
        response.writeHeader("Access-Control-Allow-Methods", "POST");
        // echo all requested access-control-request-headers back to the response
        if (acrh !== "") {
          response.writeHeader("Access-Control-Allow-Headers", acrh);
        }

        // Make browsers and compliant clients cache the OPTIONS preflight response for 10
        // minutes (this is the maximum time Chromium allows)
        response.writeHeader("Access-Control-Max-Age", "600"); // seconds
      }

      // From the spec: https://fetch.spec.whatwg.org/#http-responses
      // "For a CORS-preflight request, request’s credentials mode is always "omit",
      // but for any subsequent CORS requests it might not be. Support therefore
      // needs to be indicated as part of the HTTP response to the CORS-preflight request as well.", so this
      // header is added to all requests.
      // Additionally, https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Credentials,
      // states that there aren't any HTTP Request headers that indicate you whether or not Request.withCredentials
      // is set. Because web3@1.0.0-beta.35-? always sets `request.withCredentials = true` while Safari requires it be
      // returned even when no credentials are set in the browser this header must always be return on all requests.
      // (I've found that Chrome and Firefox don't actually require the header when credentials aren't set)
      //  Regression Commit: https://github.com/ethereum/web3.js/pull/1722
      //  Open Web3 Issue: https://github.com/ethereum/web3.js/issues/1802
      response.writeHeader("Access-Control-Allow-Credentials", "true");

      // From the spec: "It cannot be reliably identified as participating in the CORS protocol
      // as the `Origin` header is also included for all requests whose method is neither
      // `GET` nor `HEAD`."
      // Explicitly set the origin instead of using *, since credentials
      // can't be used in conjunction with *. This will always be set
      /// for valid preflight requests.
      response.writeHeader("Access-Control-Allow-Origin", origin);
    }
  };
}

function sendResponse(
  response: HttpResponse,
  closeConnection: boolean,
  statusCode: HttpResponseCodes,
  contentType: RecognizedString | null,
  data: RecognizedString | null,
  writeHeaders: (response: HttpResponse) => void = noop
): void {
  response.cork(() => {
    response.writeStatus(statusCode);
    writeHeaders(response);
    if (contentType != null) {
      response.writeHeader("Content-Type", contentType);
    }

    if (data !== null) {
      response.end(data, closeConnection);
    } else {
      // in the case that body is not provided, it must specifically be <undefined> and not <null>
      response.end(undefined, closeConnection);
    }
  });
}

function sendChunkedResponse(
  response: HttpResponse,
  closeConnection: boolean,
  statusCode: HttpResponseCodes,
  contentType: RecognizedString | null,
  data: Generator<Buffer, void, void>,
  chunkSize: number,
  writeHeaders: (response: HttpResponse) => void = noop
) {
  const fragments = getFragmentGenerator(data, chunkSize);
  // get our first fragment
  const { value: firstFragment } = fragments.next();
  // check if there is any more fragments after this one
  let { value: nextFragment, done } = fragments.next();
  // if there are no more fragments send the "firstFragment" via `sendResponse`,
  // as we don't need to chunk it.
  if (done) {
    sendResponse(
      response,
      closeConnection,
      statusCode,
      contentType,
      firstFragment as RecognizedString,
      writeHeaders
    );
  } else {
    response.cork(() => {
      response.writeStatus(statusCode);
      writeHeaders(response);
      response.writeHeader("Content-Type", contentType);
      // since we have at least two fragments send both now
      response.write(firstFragment as RecognizedString);
      response.write(nextFragment as RecognizedString);
      // and then keep sending the rest
      for (nextFragment of fragments) {
        response.write(nextFragment as RecognizedString);
      }
      response.end(undefined, closeConnection);
    });
  }
}

export type HttpServerOptions = Pick<
  InternalServerOptions["server"],
  "rpcEndpoint" | "chunkSize"
>;

export default class HttpServer<C extends Connector<any, any, any>> {
  #connector: C;
  #options: HttpServerOptions;
  #isClosing = false;

  constructor(app: TemplatedApp, connector: C, options: HttpServerOptions) {
    this.#connector = connector;
    this.#options = options;

    // JSON-RPC routes...
    app
      .post(options.rpcEndpoint, this.#handlePost)
      .options(options.rpcEndpoint, this.#handleOptions);

    // because Easter Eggs are fun...
    app.get("/418", response => {
      if (this.#isClosing) return void response.close();

      sendResponse(
        response,
        this.#isClosing,
        HttpResponseCodes.IM_A_TEAPOT,
        ContentTypes.PLAIN,
        "418 I'm a teapot"
      );
    });

    // fallback routes...
    app.any("/*", (response, request) => {
      if (this.#isClosing) return void response.close();

      const connectionHeader = request.getHeader("connection");
      if (connectionHeader && connectionHeader.toLowerCase() === "upgrade") {
        // if we got here it means the websocket server wasn't enabled but
        // a client tried to connect via websocket. This is a Bad Request.
        sendResponse(
          response,
          this.#isClosing,
          HttpResponseCodes.BAD_REQUEST,
          ContentTypes.PLAIN,
          "400 Bad Request"
        );
      } else {
        // all other requests don't mean anything to us, so respond with `404 Not Found`...
        sendResponse(
          response,
          this.#isClosing,
          HttpResponseCodes.NOT_FOUND,
          ContentTypes.PLAIN,
          "404 Not Found"
        );
      }
    });
  }

  #handlePost = (response: HttpResponse, request: HttpRequest) => {
    if (this.#isClosing) return void response.close();

    // handle JSONRPC post requests...
    const writeHeaders = prepareCORSResponseHeaders("POST", request);

    // TODO(perf): pre-allocate the buffer if we know the Content-Length
    let buffer: Buffer;
    let aborted = false;
    response.onAborted(() => {
      aborted = true;
    });
    response.onData((message: ArrayBuffer, isLast: boolean) => {
      const chunk = Buffer.from(message);
      if (isLast) {
        // we have to use any here because typescript isn't smart enough
        // to understand the ambiguity of RequestFormat and ReturnType
        // on the Connector interface must match up appropriately
        const connector = this.#connector as any;

        let payload: ReturnType<C["parse"]>;
        try {
          const message = buffer
            ? Buffer.concat([buffer, chunk], buffer.length + chunk.length)
            : chunk;
          payload = connector.parse(message);
        } catch (e: any) {
          sendResponse(
            response,
            this.#isClosing,
            HttpResponseCodes.BAD_REQUEST,
            ContentTypes.PLAIN,
            "400 Bad Request: " + e.message,
            writeHeaders
          );
          return;
        }

        connector
          .handle(payload, request)
          .then(({ value }) => value)
          .then(result => {
            if (aborted) {
              // if the request has been aborted don't try sending (it'll
              // cause an `Unhandled promise rejection` if we try)
              return;
            }
            const data = connector.format(result, payload);
            if (types.isGeneratorObject(data)) {
              sendChunkedResponse(
                response,
                this.#isClosing,
                HttpResponseCodes.OK,
                ContentTypes.JSON,
                data as Generator<Buffer, void, void>,
                this.#options.chunkSize,
                writeHeaders
              );
            } else {
              sendResponse(
                response,
                this.#isClosing,
                HttpResponseCodes.OK,
                ContentTypes.JSON,
                data,
                writeHeaders
              );
            }
          })
          .catch(error => {
            if (aborted) {
              // if the request has been aborted don't try sending (it'll
              // cause an `Unhandled promise rejection` if we try)
              return;
            }
            const data = connector.formatError(error, payload);
            sendResponse(
              response,
              this.#isClosing,
              HttpResponseCodes.OK,
              ContentTypes.JSON,
              data,
              writeHeaders
            );
          });
      } else {
        if (buffer) {
          buffer = Buffer.concat([buffer, chunk], buffer.length + chunk.length);
        } else {
          buffer = Buffer.concat([chunk], chunk.length);
        }
      }
    });
  };

  #handleOptions = (response: HttpResponse, request: HttpRequest) => {
    if (this.#isClosing) return void response.close();

    // handle CORS preflight requests...
    const writeHeaders = prepareCORSResponseHeaders("OPTIONS", request);
    // OPTIONS responses don't have a body, so respond with `204 No Content`...
    sendResponse(
      response,
      this.#isClosing,
      HttpResponseCodes.NO_CONTENT,
      null,
      null,
      writeHeaders
    );
  };

  public close() {
    // flags the server as closing, indicating the connection should be closed with subsequent responses
    // as there is no way presently to close existing connections outside of the request/response context
    // see discussion: https://github.com/uNetworking/uWebSockets.js/issues/663#issuecomment-1026283415
    this.#isClosing = true;
  }
}
