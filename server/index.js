import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import morgan from "morgan";
import { errorHandler, routeNotFound } from "./middleware/errorMiddleware.js";
import routes from "./routes/index.js";
import dbConnection from "./utils/connectDB.js";
import cron from "node-cron";
import { enqueueReminderScan, startReminderWorker } from "./queues/reminderQueue.js";

dbConnection();

const port = process.env.PORT || 5000;

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
    origin: ["http://localhost:3000", "http://localhost:3001","https://teamtaskify.netlify.app"],
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

app.listen(port, () => console.log(`Server listening on ${port}`));
