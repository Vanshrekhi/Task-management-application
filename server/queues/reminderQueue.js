import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { processAssignmentEmailJob, processReminderScanJob } from "../jobs/taskReminder.js";

const queueName = "taskify-reminders";

function getRedisConnection() {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error(
      "REDIS_URL is not set. BullMQ/ioredis will not fall back to localhost."
    );
  }
  return new IORedis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

let _reminderQueue;
function getReminderQueue() {
  if (_reminderQueue) return _reminderQueue;

  _reminderQueue = new Queue(queueName, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: 200,
      removeOnFail: 500,
    },
  });

  return _reminderQueue;
}

export function startReminderWorker() {
  const worker = new Worker(
    queueName,
    async (job) => {
      switch (job.name) {
        case "send-assignment-email":
          return processAssignmentEmailJob(job);
        case "scan-reminders":
          return processReminderScanJob(job);
        default:
          throw new Error(`Unknown reminder job: ${job.name}`);
      }
    },
    { connection: getRedisConnection() }
  );

  worker.on("failed", (job, err) => {
    console.error(`[reminderQueue] job failed`, job?.name, job?.id, err);
  });

  worker.on("error", (err) => {
    console.error(`[reminderQueue] worker error`, err);
  });

  return worker;
}

export async function enqueueAssignmentEmail({ taskId, triggeredByUserId }) {
  if (!taskId) throw new Error("enqueueAssignmentEmail requires taskId");

  return getReminderQueue().add(
    "send-assignment-email",
    { taskId, triggeredByUserId },
    { jobId: `assignment:${taskId}:${Date.now()}` }
  );
}

export async function enqueueReminderScan() {
  return getReminderQueue().add("scan-reminders", {}, { jobId: `scan:${Date.now()}` });
}

