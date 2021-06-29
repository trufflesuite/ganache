import Emittery from "emittery";
import TezosApi from "./api";
import { JsonRpcTypes, types, utils } from "@ganache/utils";
import TezosProvider from "./provider";
import {
  RecognizedString,
  WebSocket,
  HttpRequest,
  TemplatedApp
} from "uWebSockets.js";
import { CodedError, ErrorCodes } from "@ganache/tezos-utils";
import { TezosProviderOptions } from "@ganache/tezos-options";
import { URLSearchParams } from "url";
import {
  EndpointConfig,
  EndpointMethod,
  Parameter,
  ParameterCategory,
  SpecialQueryParameter
} from "./helpers/decorators";

import { isLeft, Left, Right } from "fp-ts/Either";
import {
  BooleanFromString,
  DateFromISOString,
  NumberFromString
} from "io-ts-types";
import * as D from "io-ts/Decoder";
import { isRight } from "fp-ts/lib/These";
import { Operation } from "./things";
import { Decoder } from "io-ts-extra";

export type ProviderOptions = TezosProviderOptions;
export type Provider = TezosProvider;
export const Provider = TezosProvider;

function isHttp(
  connection: HttpRequest | WebSocket
): connection is HttpRequest {
  return connection.constructor.name === "uWS.HttpRequest";
}

export class Connector
  extends Emittery.Typed<undefined, "ready" | "close">
  implements
    types.Connector<
      TezosApi,
      any,
      any
      // JsonRpcTypes.Request<TezosApi> | JsonRpcTypes.Request<TezosApi>[],
      // JsonRpcTypes.Response
    > {
  #provider: TezosProvider;

  get provider() {
    return this.#provider;
  }

  constructor(
    providerOptions: ProviderOptions = null,
    executor: utils.Executor
  ) {
    super();

    const provider = (this.#provider = new TezosProvider(
      providerOptions,
      executor
    ));
    provider.on("connect", () => {
      // tell the consumer (like a `ganache-core` server/connector) everything is ready
      this.emit("ready");
    });
  }

  addRoutes(app: TemplatedApp) {
    const endpoints: EndpointConfig[] = Reflect.get(
      TezosApi.prototype,
      "endpoints-config"
    );

    endpoints.forEach(endpoint => {
      switch (endpoint.method) {
        case EndpointMethod.Get:
          this.addNewGetEndpoint(app, endpoint);
          break;
        case EndpointMethod.Post:
          this.addNewPostEndpoint(app, endpoint);
          break;
        case EndpointMethod.Put:
          this.addNewPutEndpoint(app, endpoint);
          break;
      }
    });

    app
      .get("/candy/:kind", (res, req) => {
        /* Parameters */
        res.end(
          "So you want candy? Have some " +
            req.getParameter(0) +
            req.getQuery() +
            "!"
        );
      })
      .get("/chains/:chainid", (res, req) => {
        /* It does Http as well */
        res
          .writeStatus("200 OK")
          .writeHeader("IsExample", "Yes")
          .end("Hello there!" + req.getParameter(0));
      });
  }

  private addNewGetEndpoint(app: TemplatedApp, endpoint: EndpointConfig) {
    app.get(endpoint.url, (res, req) => {
      this.configureEndpoint(endpoint, req, res);
    });
  }

  private addNewPostEndpoint(app: TemplatedApp, endpoint: EndpointConfig) {
    app.post(endpoint.url, (res, req) => {
      this.configureEndpoint(endpoint, req, res);
    });
  }

  private addNewPutEndpoint(app: TemplatedApp, endpoint: EndpointConfig) {
    app.put(endpoint.url, (res, req) => {
      this.configureEndpoint(endpoint, req, res);
    });
  }

  private configureEndpoint(endpoint: EndpointConfig, req: HttpRequest, res) {
    const parameters = [];
    try {
      endpoint.parameters
        .sort((a, b) => a.index - b.index)
        .forEach(param => {
          switch (param.category) {
            case ParameterCategory.Url:
              parameters.push(this.getUrlParameter(req, endpoint, param));
              break;
            case ParameterCategory.Query:
              const query = req.getQuery();
              const urlSearchParams = new URLSearchParams(query);
              parameters.push(this.getQueryParameter(urlSearchParams, param));
              break;
            case ParameterCategory.Body:
              if (
                endpoint.method === EndpointMethod.Post ||
                endpoint.method === EndpointMethod.Put
              ) {
                this.getBodyParameter(res, obj => {
                  if (param.type !== undefined) {
                    const validationResult = (param.type as Decoder<unknown>).decode(
                      obj
                    );

                    if (isLeft((param.type as Decoder<unknown>).decode(obj))) {
                      res
                        .writeStatus("400 BadRequest")
                        .end(
                          "Invalid request. Expected request format : " +
                            param.type["name"]
                        );
                    }
                  }
                  TezosApi.prototype[endpoint.url]
                    .call(this, ...parameters, obj)
                    .then(response => {
                      res
                        .writeHeader("Content-Type", "application/json")
                        .end(JSON.stringify(response));
                    });
                });
              }
              break;
          }
        });
      if (
        endpoint.method === EndpointMethod.Get ||
        endpoint.method === EndpointMethod.Delete
      ) {
        TezosApi.prototype[endpoint.url]
          .call(this, ...parameters)
          .then(response => {
            res
              .writeHeader("Content-Type", "application/json")
              .end(JSON.stringify(response));
          });
      }
    } catch (error) {
      res.writeStatus("400 BadRequest").end(error.message);
    }
  }

  private getQueryParameter(
    urlSearchParams: URLSearchParams,
    param: Parameter
  ) {
    if (param.required && !urlSearchParams.has(param.name)) {
      throw new Error(
        "Parameter (" + param.name + ") not found in query string"
      );
    }

    if (!urlSearchParams.has(param.name)) return null;
    const queryParameter: any = urlSearchParams.get(param.name);
    const value = this.parseParameter(param, queryParameter);
    return value;
  }

  private getUrlParameter(
    req: HttpRequest,
    endpoint: EndpointConfig,
    param: Parameter
  ) {
    const paramIndex = endpoint.url
      .split("/")
      .filter(f => f.includes(":"))
      .indexOf(":" + param.name);

    const urlParameter = req.getParameter(paramIndex);
    const value = this.parseParameter(param, urlParameter);
    return value;
  }

  private async getBodyParameter(res: any, cb) {
    this.readJson(
      res,
      obj => {
        cb(obj);
      },
      () => {
        /* Request was prematurely aborted or invalid or missing, stop reading */
        console.log("Invalid JSON or no data at all!");
        cb(null);
      }
    );
  }

  private parseParameter(param: Parameter, value: any) {
    let validationResult: Left<unknown> | Right<unknown>;
    switch (param.type) {
      case Number:
        validationResult = NumberFromString.decode(value);
        if (isLeft(validationResult)) {
          throw new Error("Parameter (" + param.name + ") is not a number");
        }
        value = Number.parseFloat(value);
        break;
      case Boolean:
        validationResult = BooleanFromString.decode(value);
        if (isLeft(validationResult)) {
          throw new Error("Parameter (" + param.name + ") is not a boolean");
        }
        value = Boolean(value);
        break;
      case Date:
        validationResult = DateFromISOString.decode(value);
        if (isLeft(validationResult)) {
          throw new Error("Parameter (" + param.name + ") is not a date");
        }
        value = Date.parse(value);
        break;
      case SpecialQueryParameter:
        value = SpecialQueryParameter[param.name.toLowerCase()];
        // if (isLeft(validationResult)) {
        //   throw new Error("Parameter (" + param.name + ") is not a date");
        // }
        // value = Date.parse(value);
        break;
      default:
        break;
    }
    return value;
  }

  /* Helper function for reading a posted JSON body */
  private readJson(res, cb, err) {
    let buffer;
    /* Register data cb */
    res.onData((ab, isLast) => {
      let chunk = Buffer.from(ab);
      if (isLast) {
        let json;
        if (buffer) {
          try {
            json = JSON.parse(Buffer.concat([buffer, chunk]));
          } catch (e) {
            /* res.close calls onAborted */
            res.close();
            return;
          }
          cb(json);
        } else {
          try {
            json = JSON.parse(chunk);
          } catch (e) {
            /* res.close calls onAborted */
            res.close();
            return;
          }
          cb(json);
        }
      } else {
        if (buffer) {
          buffer = Buffer.concat([buffer, chunk]);
        } else {
          buffer = Buffer.concat([chunk]);
        }
      }
    });

    /* Register error cb */
    res.onAborted(err);
  }

  parse(message: Buffer) {
    try {
      return JSON.parse(message) as JsonRpcTypes.Request<TezosApi>;
    } catch (e) {
      throw new CodedError(e.message, ErrorCodes.PARSE_ERROR);
    }
  }

  handle(
    payload: JsonRpcTypes.Request<TezosApi> | JsonRpcTypes.Request<TezosApi>[],
    connection: HttpRequest | WebSocket
  ) {
    if (Array.isArray(payload)) {
      // handle batch transactions
      const promises = payload.map(payload =>
        this.#handle(payload, connection)
          .then(({ value }) => value)
          .catch(e => e)
      );
      return Promise.resolve({ value: Promise.all(promises) });
    } else {
      return this.#handle(payload, connection);
    }
  }
  #handle = (
    payload: JsonRpcTypes.Request<TezosApi>,
    connection: HttpRequest | WebSocket
  ) => {
    const method = payload.method;
    // TODO: Add tezos specific error codes
    const params = payload.params as Parameters<TezosApi[typeof method]>;
    return this.#provider._requestRaw({ method, params });
  };

  format(
    result: any,
    payload: JsonRpcTypes.Request<TezosApi>
  ): RecognizedString;
  format(
    results: any[],
    payloads: JsonRpcTypes.Request<TezosApi>[]
  ): RecognizedString;
  format(
    results: any | any[],
    payload: JsonRpcTypes.Request<TezosApi> | JsonRpcTypes.Request<TezosApi>[]
  ): RecognizedString {
    if (Array.isArray(payload)) {
      return JSON.stringify(
        payload.map((payload, i) => {
          const result = results[i];
          if (result instanceof Error) {
            return JsonRpcTypes.Error(payload.id, result as any);
          } else {
            return JsonRpcTypes.Response(payload.id, result);
          }
        })
      );
    } else {
      const json = JsonRpcTypes.Response(payload.id, results);
      return JSON.stringify(json);
    }
  }

  formatError(
    error: Error & { code: number },
    payload: JsonRpcTypes.Request<TezosApi>
  ): RecognizedString {
    const json = JsonRpcTypes.Error(
      payload && payload.id ? payload.id : null,
      error
    );
    return JSON.stringify(json);
  }

  close() {
    return this.#provider.disconnect();
  }
}
