import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { createServer } from "http";
import jwt from "jsonwebtoken";
import morgan from "morgan";
import { Server } from "socket.io";
import { errorHandler, routeNotFound } from "./middleware/errorMiddleware.js";
import User from "./models/userModel.js";
import routes from "./routes/index.js";
import { registerChatHandlers } from "./socket/chat.js";
import dbConnection from "./utils/connectDB.js";
import cron from "node-cron";
import { enqueueReminderScan, startReminderWorker } from "./queues/reminderQueue.js";

const port = process.env.PORT || 5000;
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://teamtaskify.netlify.app",
];

const app = express();

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "DELETE", "PUT"],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

app.use(morgan("dev"));
app.use("/api", routes);

app.use(routeNotFound);
app.use(errorHandler);

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

const parseTokenFromCookie = (cookieHeader = "") => {
  const tokenEntry = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("token="));
  return tokenEntry ? decodeURIComponent(tokenEntry.split("=")[1]) : null;
};

io.use(async (socket, next) => {
  try {
    const token = parseTokenFromCookie(socket.handshake.headers.cookie || "");
    if (!token) return next(new Error("Unauthorized"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("_id name email");
    if (!user) return next(new Error("Unauthorized"));

    socket.user = user;
    next();
  } catch (error) {
    next(new Error("Unauthorized"));
  }
});

registerChatHandlers(io);

const start = async () => {
  // Ensure Mongo is connected before serving requests (prevents mongoose buffering timeouts)
  await dbConnection();

  // Start BullMQ worker (processes assignment + reminder scan jobs)
  await startReminderWorker();

  // Cron: enqueue a scan job every hour (BullMQ processes it)
  cron.schedule("0 * * * *", () => {
    enqueueReminderScan().catch((err) =>
      console.error("[cron] enqueueReminderScan failed", err)
    );
  });

  httpServer.listen(port, () => console.log(`Server listening on ${port}`));
};

start().catch((err) => {
  console.error("[startup] failed", err?.message || err);
  process.exit(1);
});
