import { TemplatedApp, HttpResponse, HttpRequest, RecognizedString } from "uWebSockets.js";
import ContentTypes from "./content-types";
import rpcError from "./rpc-error";
import Provider from "../provider";

const _handlePost = Symbol("handlePost");
const _handleOptions = Symbol("handleOptions");
const _provider = Symbol("provider");
const noop = () => { };

/**
 * uWS doesn't let us use the request after the request method has completed.
 * But we can't set headers until after the statusCode is set. But we don't
 * know the status code until the provider returns asynchronously.
 * So this does request-related work immediately and returns a function to do the
 * rest of the work later.
 * @param method 
 * @param request 
 */
function prepareCORSResponseHeaders(method: string, request: HttpRequest) {
    // https://fetch.spec.whatwg.org/#http-requests
    const origin = request.getHeader("origin");
    const acrh = request.getHeader("access-control-request-headers");
    return (response: HttpResponse) => {
        const isCORSRequest = true || origin !== "";
        if (isCORSRequest) {
            // OPTIONS preflight requests need a little extra treatment
            if (method === "OPTIONS") {
                // we only allow POST requests, so it doesn't matter which method the request is asking for
                response.writeHeader("Access-Control-Allow-Methods", "POST");
                // echo all requested access-control-request-headers back to the response
                if (acrh !== "") {
                    response.writeHeader("Access-Control-Allow-Headers", acrh);
                }
                // Safari needs Content-Length = 0 for a 204 response otherwise it hangs forever
                // https://github.com/expressjs/cors/pull/121#issue-130260174
                response.writeHeader("Content-Length", "0");

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
    }
}


function sendResponse(response: HttpResponse, statusCode: number, contentType?: RecognizedString, data?: RecognizedString, writeHeaders: (response: HttpResponse) => void = noop): void {
    response.writeStatus(statusCode.toString());
    writeHeaders(response);
    if (contentType) {
        response.writeHeader("Content-Type", contentType);
    }
    response.end(data)
}

type JsonRpcRequest = {
    id: string,
    jsonrpc: string,
    method: string,
    params?: Array<any>
}

function parse(message: string): JsonRpcRequest {
    return JSON.parse(message);
}

export default class HttpServer {
    private [_provider]: Provider;
    constructor(app: TemplatedApp, provider: Provider) {
        this[_provider] = provider;

        // JSON-RPC routes...
        app
            .post("/", this[_handlePost].bind(this))
            .options("/", this[_handleOptions].bind(this));

        // because Easter Eggs are fun...
        app.get("/418", (response: HttpResponse) => {
            sendResponse(response, 418, ContentTypes.PLAIN, "418 I'm a teapot");
        });

        // fallback routes...
        app
            .any("/", (response: HttpResponse) => {
                // any other request to "/" is not allowed, so respond with `405 Method Not Allowed`...
                sendResponse(response, 405, ContentTypes.PLAIN, "405 Method Not Allowed");
            })
            .any("/*", (response: HttpResponse) => {
                // all other requests don't mean anything to us, so respond with `404 NOT FOUND`...
                sendResponse(response, 404, ContentTypes.PLAIN, "404 Not Found");
            });
    }

    private [_handlePost](response: HttpResponse, request: HttpRequest) {
        // handle JSONRPC post requests...
        const writeHeaders = prepareCORSResponseHeaders("POST", request);

        let buffer: Buffer;
        response.onData((message: ArrayBuffer, isLast: boolean) => {
            const chunk = Buffer.from(message);
            if (isLast) {
                let payload: JsonRpcRequest;
                try {
                    const message = (buffer ? Buffer.concat([buffer, chunk]) : chunk) as any;
                    payload = parse(message);
                } catch (e) {
                    sendResponse(response, 400, ContentTypes.PLAIN, "400 Bad Request: " + e.message, writeHeaders);
                    return;
                }
                const method = payload.method;

                // http connections do not support subscriptions
                if (method === "eth_subscribe" || method === "eth_unsubscribe") {
                    sendResponse(response, 400, ContentTypes.JSON, rpcError(payload.id, "-32000", "notifications not supported"), writeHeaders);
                } else {
                    // `await`ing the `provider.send` instead of using `then`
                    // causes uWS to delay cleaning up the `request` object
                    this[_provider].send(method, payload.params)
                        .then((result) => {
                            if (!response.aborted) {
                                const json = {
                                    "id": payload.id,
                                    "jsonrpc": "2.0",
                                    "result": result
                                };
                                sendResponse(response, 200, ContentTypes.JSON, JSON.stringify(json), writeHeaders);
                            }
                        });
                }
            } else {
                if (buffer) {
                    buffer = Buffer.concat([buffer, chunk]);
                } else {
                    buffer = Buffer.concat([chunk]);
                }
            }
        });
        response.onAborted(() => {
            response.aborted = true;
        });
    }

    private [_handleOptions](response: HttpResponse, request: HttpRequest) {
        // handle CORS preflight requests...
        const writeHeaders = prepareCORSResponseHeaders("OPTIONS", request);
        // OPTIONS responses don't have a body, so respond with `204 No Content`...
        sendResponse(response, 204, null, null, writeHeaders);
    }
    public close() {
        // currently a no op.
    }
};
