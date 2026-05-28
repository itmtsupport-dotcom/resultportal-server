const notFoundHandler = (req, res) => {
  res.status(404).json({ error: "Route not found" });
};

const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || "Internal Server Error"
  });
};

module.exports = { notFoundHandler, errorHandler };
