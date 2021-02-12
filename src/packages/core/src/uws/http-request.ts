import { HttpRequest as uWsHttpRequest } from "uWebSockets.js";
import { IncomingMessage } from "http";
import { URL } from "url";
import { parse } from "querystring";

export class HttpRequest implements uWsHttpRequest {
  static MAX_HEADERS: 50;
  private headers = new Map<string, string>();
  private ancientHttp: boolean;
  private didYield: boolean;
  private currentParameters: [number, string[]];
  private request: IncomingMessage;

  constructor(request: IncomingMessage) {
    this.request = request;
  }

  public isAncient() {
    return this.ancientHttp;
  }

  public getYield() {
    return this.didYield;
  }

  /**
   * If you do not want to handle this route
   * @param yield
   */
  public setYield(yielded: boolean) {
    this.didYield = yielded;
    return this;
  }

  public getHeader(lowerCasedHeader: string) {
    for (let [key, value] of this.headers) {
      if (key.toLowerCase() === lowerCasedHeader) {
        return value;
      }
    }
    return null;
  }

  public getUrl() {
    return this.request.url;
  }

  public getMethod() {
    return this.request.method;
  }

  /**
   * Returns the raw querystring as a whole, still encoded
   */
  public getQuery();
  /**
   * Finds and decodes the URI component.
   * @param key
   */
  public getQuery(key?: string) {
    const search = new URL(this.request.url).search;
    if (key != null) {
      return parse(key)[key];
    } else {
      return search;
    }
  }

  public setParameters(parameters: [number, string[]]) {
    this.currentParameters = parameters;
  }

  public getParameter(index: number) {
    if (this.currentParameters[0] < index) {
      return null;
    } else {
      return this.currentParameters[1][index];
    }
  }

  forEach(cb: (key: string, value: string) => void) {
    throw new Error("Not implemented");
  }
}
