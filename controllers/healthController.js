const { ok } = require("../utils/response");

const healthCheck = (req, res) => {
  ok(res, {
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
};

module.exports = { healthCheck };
