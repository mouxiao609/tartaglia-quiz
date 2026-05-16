const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const types = {
  ".html": "text/html;charset=utf-8",
  ".css": "text/css;charset=utf-8",
  ".js": "text/javascript;charset=utf-8",
};

http
  .createServer((req, res) => {
    let route = decodeURIComponent(req.url.split("?")[0]);
    if (route === "/") route = "/index.html";
    const file = path.join(root, route);
    if (!file.startsWith(root)) {
      res.writeHead(403);
      res.end("forbidden");
      return;
    }
    fs.readFile(file, (error, data) => {
      if (error) {
        res.writeHead(404);
        res.end("not found");
        return;
      }
      res.writeHead(200, { "Content-Type": types[path.extname(file)] || "text/plain" });
      res.end(data);
    });
  })
  .listen(4173, "127.0.0.1");
