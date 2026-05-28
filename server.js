require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const { sequelize } = require("./config/database");
const { setIo } = require("./services/notificationService");
const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5002",
  "http://127.0.0.1:5002",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174"
];

const allowedOrigins = String(
  process.env.ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS.join(",")
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const port = normalizePort(process.env.PORT || "3000");
app.set("port", port);

const server = http.createServer(app);

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});

// Pass io instance to notification service
setIo(io);

// Sync Database
sequelize.sync({ alter: true }).then(() => {
  console.log("Database synchronized");
}).catch(err => {
  console.error("Database synchronization failed:", err);
});

io.on("connection", (socket) => {
  console.log("New client connected", socket.id);
  socket.on("disconnect", () => {
    console.log("Client disconnected", socket.id);
  });
});

server.on("error", onError);
server.on("listening", onListening);

start();

async function start() {
  try {
    await sequelize.authenticate();
    console.log("Database connection has been established successfully.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
    console.log("Starting server without database connection for development/preview...");
  }
  server.listen(port);
}

function normalizePort(value) {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return value;
  }
  if (parsed >= 0) {
    return parsed;
  }
  return false;
}

function onError(error) {
  if (error.syscall !== "listen") {
    throw error;
  }
  const bind = typeof port === "string" ? `Pipe ${port}` : `Port ${port}`;
  switch (error.code) {
    case "EACCES":
      throw new Error(`${bind} requires elevated privileges`);
    case "EADDRINUSE":
      throw new Error(`${bind} is already in use`);
    default:
      throw error;
  }
}

function onListening() {
  const addr = server.address();
  const bind = typeof addr === "string" ? `pipe ${addr}` : `port ${addr.port}`;
  process.stdout.write(`Server listening on ${bind}\n`);
}
