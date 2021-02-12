import { RecognizedString } from "uWebSockets.js";
import HttpResponseCodes from "../servers/utils/http-response-codes";
import { HttpResponse } from "./http-response";
import uWSa from "./uws";
import uWSb from "uWebSockets.js";

function app(uWS: any, p: number) {
  const app = uWS.App();

  function sendResponse(
    response: HttpResponse,
    statusCode: HttpResponseCodes,
    contentType?: RecognizedString,
    data?: RecognizedString,
    writeHeaders: (response: HttpResponse) => void = () => {}
  ): void {
    response.cork(() => {
      response.writeStatus(statusCode);
      writeHeaders(response);
      if (contentType) {
        response.writeHeader("Content-Type", contentType);
      }
      response.end(data);
    });
  }

  app.get("/418", response => {
    sendResponse(
      response as any,
      HttpResponseCodes.IM_A_TEAPOT,
      "text/plain",
      "418 I'm a teapot"
    );
  });

  app.get("/why/:hello/", (res, req) => {
    res.end(req.getParameter(0));
  });
  // app.any("/*", (res, req) => {
  //   res.end("nope!");
  // });

  app.get("/abc/:000llo", (res, req) => {
    res.end("3");
  });
  app.get("/abc/:zaallo", (res, req) => {
    res.end("2");
  });
  app.get("/abc/:zaaaaello", (res, req) => {
    res.end(req.getParameter(0));
  });

  app.listen(p, a => {
    console.log(a, 123);
  });
}

app(uWSa, 8545);
app(uWSb, 8546);
