import http, { IncomingMessage, ServerResponse } from "http";
import { Socket } from "net";
import { RecognizedString } from "uWebSockets.js";
import { HttpRouter } from "./http-router";
import { HttpHandler, ListenCallback, Method } from "./types";

export class HttpContext {
  router: HttpRouter = new HttpRouter();
  http: http.Server;
  closed: boolean = false;

  constructor() {}

  public onHttp(
    method: Method | "*",
    pattern: RecognizedString,
    handler: HttpHandler,
    upgrade: boolean = false
  ) {
    // Todo: This is ugly, fix
    let methods: readonly Method[];
    if (method === "*") {
      methods = this.router.methods;
    } else {
      methods = [method];
    }

    this.router.add(
      methods,
      pattern.toString(),
      (r: HttpRouter) => {
        const user = r.getUserData();
        user.httpRequest.setYield(false);
        user.httpRequest.setParameters(r.getParameters());

        /* Middleware? Automatically respond to expectations */
        const expect = user.httpRequest.getHeader("expect");
        if (expect != null && expect == "100-continue") {
          user.httpResponse.writeContinue();
        }

        handler(user.httpResponse, user.httpRequest);

        /* If any handler yielded, the router will keep looking for a suitable handler. */
        if (user.httpRequest.getYield()) {
          return false;
        }
        return true;
      },
      method === "*"
        ? this.router.LOW_PRIORITY
        : upgrade
        ? this.router.HIGH_PRIORITY
        : this.router.MEDIUM_PRIORITY
    );
  }

  handleRequest(req: IncomingMessage, res: ServerResponse) {
    this.router.setUserData(req, res);
    if (!this.router.route(req.method.toLowerCase(), req.url)) {
      res.destroy();
      return null;
    }
  }

  private sockets = new Set<Socket>();
  listen(host: string, port: number, callback: ListenCallback) {
    this.http = http.createServer(this.handleRequest.bind(this));
    this.http.on("connection", socket => {
      this.http.once("close", () => {
        this.sockets.delete(socket);
      });
    });
    this.http.listen({ port, host, exclusive: true }, () => {
      this.closed = false;
      callback(this);
    });
  }

  close(cb: any) {
    this.closed = true;
    for (const socket of this.sockets) {
      socket.destroy();
      this.sockets.delete(socket);
    }

    this.http.close(() => {
      this.http = null;
      cb();
    });
  }
}
