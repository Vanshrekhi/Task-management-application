import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { createServer } from "http";
import jwt from "jsonwebtoken";
import morgan from "morgan";
import { Server } from "socket.io";
import { errorHandler, routeNotFound } from "./middleware/errorMiddleware.js";
import ChatRoom from "./models/chatRoomModel.js";
import User from "./models/userModel.js";
import routes from "./routes/index.js";
import dbConnection from "./utils/connectDB.js";
import cron from "node-cron";
import { enqueueReminderScan, startReminderWorker } from "./queues/reminderQueue.js";

dbConnection();

const port = process.env.PORT || 5000;
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://teamtaskify.netlify.app",
];

const app = express();

// Start BullMQ worker (processes assignment + reminder scan jobs)
startReminderWorker();

// Cron: enqueue a scan job every hour (BullMQ processes it)
cron.schedule("0 * * * *", () => {
  enqueueReminderScan().catch((err) =>
    console.error("[cron] enqueueReminderScan failed", err)
  );
});

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

io.on("connection", (socket) => {
  const currentUserId = String(socket.user._id);
  socket.join(`user:${currentUserId}`);

  socket.on("chat:request-join", async ({ key }) => {
    const room = await ChatRoom.findOne({ key, isActive: true });
    if (!room) {
      return socket.emit("chat:error", "Room not found or already ended.");
    }

    if (String(room.host) === currentUserId) {
      socket.join(`room:${key}`);
      return socket.emit("chat:join-approved", { key, host: true });
    }

    const member = room.teamMembers.find(
      (m) => String(m.user) === currentUserId
    );
    if (!member) {
      room.teamMembers.push({ user: currentUserId, status: "pending" });
      await room.save();
    } else if (member.status === "accepted") {
      socket.join(`room:${key}`);
      return socket.emit("chat:join-approved", { key });
    } else if (member.status === "rejected") {
      return socket.emit("chat:join-rejected", { key });
    }

    io.to(`user:${String(room.host)}`).emit("chat:join-request", {
      key,
      memberId: currentUserId,
      memberName: socket.user.name,
    });
    socket.emit("chat:join-pending", { key });
  });

  socket.on("chat:respond-request", async ({ key, memberId, approve }) => {
    const room = await ChatRoom.findOne({ key, isActive: true });
    if (!room || String(room.host) !== currentUserId) return;

    const member = room.teamMembers.find((m) => String(m.user) === String(memberId));
    if (!member) return;

    member.status = approve ? "accepted" : "rejected";
    member.respondedAt = new Date();
    await room.save();

    io.to(`user:${String(memberId)}`).emit("chat:join-response", {
      key,
      approved: approve,
    });
  });

  socket.on("chat:join-room", async ({ key }) => {
    const room = await ChatRoom.findOne({ key }).populate("messages.sender", "name");
    if (!room || !room.isActive) {
      return socket.emit("chat:error", "Room not found or already ended.");
    }

    const isHost = String(room.host) === currentUserId;
    const isAccepted = room.teamMembers.some(
      (m) => String(m.user) === currentUserId && m.status === "accepted"
    );

    if (!isHost && !isAccepted) {
      return socket.emit("chat:error", "Join request not accepted yet.");
    }

    socket.join(`room:${key}`);
    socket.emit("chat:history", { key, messages: room.messages });
  });

  socket.on("chat:send-message", async ({ key, text }) => {
    if (!text?.trim()) return;

    const room = await ChatRoom.findOne({ key });
    if (!room || !room.isActive) return;

    const isHost = String(room.host) === currentUserId;
    const isAccepted = room.teamMembers.some(
      (m) => String(m.user) === currentUserId && m.status === "accepted"
    );
    if (!isHost && !isAccepted) return;

    const message = {
      sender: socket.user._id,
      text: text.trim(),
      sentAt: new Date(),
    };

    room.messages.push(message);
    await room.save();

    const payload = {
      ...message,
      sender: { _id: socket.user._id, name: socket.user.name },
    };

    io.to(`room:${key}`).emit("chat:new-message", { key, message: payload });
  });

  socket.on("chat:end-session", async ({ key }) => {
    const room = await ChatRoom.findOne({ key });
    if (!room || String(room.host) !== currentUserId) return;

    room.messages = [];
    room.isActive = false;
    room.endedAt = new Date();
    await room.save();

    io.to(`room:${key}`).emit("chat:session-ended", { key });
  });
});

httpServer.listen(port, () => console.log(`Server listening on ${port}`));
