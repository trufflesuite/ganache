import { requestRouter } from "./routes";

addEventListener("fetch", (event) => {
  event.respondWith(requestRouter(event));
});
