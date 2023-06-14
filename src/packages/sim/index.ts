import http from "http";
import fs from "fs";
let remote = false;
const hostname = remote ? "3.140.186.190" : "localhost";
const port = remote ? 8080 : 8545;

const index = fs.readFileSync(__dirname + "/index.html");
const results = fs.readFileSync(__dirname + "/results.html");
const css = fs.readFileSync(__dirname + "/main.css");
const rootCss = fs.readFileSync(__dirname + "/root.css");
const js = fs.readFileSync(__dirname + "/app.js");
const jsonview = fs.readFileSync(__dirname + "/jsonview.js");
const chevron = fs.readFileSync(__dirname + "/chevron.svg");
const ganache = fs.readFileSync(__dirname + "/ganache.svg");

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(index);
  } else if (req.method === "GET" && req.url === "/jsonview.js") {
    res.writeHead(200, { "Content-Type": "application/javascript" });
    res.end(jsonview);
  } else if (req.method === "GET" && req.url === "/results.html") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(results);
  } else if (req.method === "GET" && req.url === "/ganache.svg") {
    res.writeHead(200, { "Content-Type": "image/svg+xml" });
    res.end(ganache);
  } else if (req.method === "GET" && req.url === "/main.css") {
    res.writeHead(200, { "Content-Type": "text/css" });
    res.end(css);
  } else if (req.method === "GET" && req.url === "/root.css") {
    res.writeHead(200, { "Content-Type": "text/css" });
    res.end(rootCss);
  } else if (req.method === "GET" && req.url === "/app.js") {
    res.writeHead(200, { "Content-Type": "application/javascript" });
    res.end(js);
  } else if (req.method === "GET" && req.url === "/chevron.svg") {
    res.writeHead(200, { "Content-Type": "image/svg+xml" });
    res.end(chevron);
  } else if (req.method === "POST" && req.url === "/simulate") {
    res.writeHead(200, { "Content-Type": "application/json" });
    // send the POST request to the simulation server
    // we just take the body from the request and send it to the simulation server
    // and then return the result directly to the user:

    const options = {
      hostname: hostname,
      port: port,
      path: "/",
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    };

    console.log(
      `Forwarding request to ${options.hostname}:${options.port}${options.path}`
    );
    const simulationReq = http.request(options, simulationRes => {
      simulationRes.on("data", data => {
        res.write(data);
      });
      simulationRes.on("end", () => {
        res.end();
      });
    });
    simulationReq.on("error", error => {
      console.error(error);
    });
    // get the body from the req:
    req.on("data", data => {
      simulationReq.write(data);
    });
    req.on("end", () => {
      simulationReq.end();
    });
  } else {
    res.writeHead(404);
    res.end("Not Found");
  }
});

server.listen(3000, () => {
  console.log(`Server is running on http://localhost:${3000}`);
});
