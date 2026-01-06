const http = require("http");
const fs = require("fs");
const path = require("path");

const port = process.env.PORT || 3000;
const baseDir = __dirname;

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

const sendJson = (res, status, payload) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
};

const handleSubscribe = (req, res) => {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
    if (body.length > 1e6) {
      req.socket.destroy();
    }
  });
  req.on("end", () => {
    try {
      const parsed = JSON.parse(body || "{}");
      const email = String(parsed.email || "").trim();
      if (!email) {
        return sendJson(res, 400, { error: "Email is required" });
      }
      const line = `${new Date().toISOString()}\t${email}\n`;
      const logPath = path.join(baseDir, "subscribe.txt");
      fs.appendFile(logPath, line, (err) => {
        if (err) {
          console.error("Failed to write subscription:", err);
          return sendJson(res, 500, { error: "Failed to save subscription" });
        }
        sendJson(res, 200, { ok: true });
      });
    } catch (err) {
      console.error("Invalid subscription payload:", err);
      sendJson(res, 400, { error: "Invalid JSON payload" });
    }
  });
};

const getContentType = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  return contentTypes[ext] || "application/octet-stream";
};

const serveStatic = (req, res) => {
  let reqPath = req.url.split("?")[0];
  if (reqPath === "/") {
    reqPath = "/index.html";
  }
  const filePath = path.join(baseDir, reqPath);
  if (!filePath.startsWith(baseDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": getContentType(filePath) });
    fs.createReadStream(filePath).pipe(res);
  });
};

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url.split("?")[0] === "/subscribe") {
    handleSubscribe(req, res);
    return;
  }
  if (req.method === "GET") {
    serveStatic(req, res);
    return;
  }
  res.writeHead(405);
  res.end("Method Not Allowed");
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
