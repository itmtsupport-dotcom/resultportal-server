const express = require("express");
const path = require("path");
const routes = require("./routes");
const { notFoundHandler, errorHandler } = require("./middlewares/error");
const { paystackWebhook } = require("./controllers/paymentsController");

const app = express();
const adminDistPath = path.join(__dirname, "..", "admin", "dist");
const portalDistPath = path.join(__dirname, "..", "portal", "dist");
const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5002",
  "http://127.0.0.1:5002",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174"
];

const allowedOrigins = new Set(
  String(process.env.ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS.join(","))
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

app.disable("x-powered-by");

app.use((req, res, next) => {
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  next();
});

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
});

// Parse JSON bodies (except for webhook)
app.use((req, res, next) => {
  if (req.originalUrl === "/api/payments/paystack/webhook") {
    next();
  } else {
    express.json()(req, res, next);
  }
});

app.post(
  "/api/payments/paystack/webhook",
  express.raw({ type: "application/json" }),
  paystackWebhook
);

app.use(express.urlencoded({ extended: true }));

// API Routes
app.use("/api", routes);

// Serve Static Uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Serve Admin App
app.use("/admin", express.static(adminDistPath));
app.get("/admin/*", (req, res) => {
  res.sendFile(path.join(adminDistPath, "index.html"));
});

// Serve Portal App
app.use("/student", express.static(portalDistPath));
app.get("/student/*", (req, res) => {
  res.sendFile(path.join(portalDistPath, "index.html"));
});

// Redirect root to student portal
app.get("/", (req, res) => {
  res.redirect("/student");
});

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
