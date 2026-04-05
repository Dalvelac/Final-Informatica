const { ok } = require("../utils/response");
const { addClient, removeClient } = require("../services/events.service");

function openStream(req, res) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  res.write(`event: connected\ndata: ${JSON.stringify({ at: new Date().toISOString() })}\n\n`);

  addClient(res);
  req.on("close", () => {
    removeClient(res);
  });
}

function ping(req, res) {
  return ok(res, { now: new Date().toISOString() }, "Sistema operativo");
}

module.exports = { openStream, ping };

