function ok(res, data, message = "OK", status = 200) {
  return res.status(status).json({ success: true, message, data });
}

function fail(res, message, status = 400, details = null) {
  const payload = { success: false, message };
  if (details) payload.details = details;
  return res.status(status).json(payload);
}

module.exports = { ok, fail };

