import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { processAssignmentEmailJob, processReminderScanJob } from "../jobs/taskReminder.js";
import { lookup } from "node:dns/promises";

const queueName = "taskify-reminders";

let _redisStatus = {
  checked: false,
  enabled: true,
  reason: "",
};

async function canUseRedis() {
  if (_redisStatus.checked) return _redisStatus.enabled;

  const url = process.env.REDIS_URL;
  if (!url) {
    _redisStatus = {
      checked: true,
      enabled: false,
      reason: "REDIS_URL is not set",
    };
    return false;
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    if (!host) throw new Error("Missing hostname");
    await lookup(host);
    _redisStatus = { checked: true, enabled: true, reason: "" };
    return true;
  } catch (err) {
    _redisStatus = {
      checked: true,
      enabled: false,
      reason: err?.message || String(err),
    };
    console.warn(
      `[reminderQueue] Redis disabled (${process.env.REDIS_URL}): ${_redisStatus.reason}`
    );
    return false;
  }
}

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

export async function startReminderWorker() {
  const ok = await canUseRedis();
  if (!ok) return null;

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

  const ok = await canUseRedis();
  if (!ok) return null;

  return getReminderQueue().add(
    "send-assignment-email",
    { taskId, triggeredByUserId },
    { jobId: `assignment:${taskId}:${Date.now()}` }
  );
}

export async function enqueueReminderScan() {
  const ok = await canUseRedis();
  if (!ok) return null;

  return getReminderQueue().add("scan-reminders", {}, { jobId: `scan:${Date.now()}` });
}

