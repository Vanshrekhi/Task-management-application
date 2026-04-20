import Task from "../models/taskModel.js";
import User from "../models/userModel.js";
import Notice from "../models/notis.js";
import {
  renderAssignedEmail,
  renderReminderEmail,
  sendEmail,
} from "../services/emailService.js";
import { notifyHodsOverdue } from "./escalation.js";

function hoursBetween(a, b) {
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60);
}

function pickReminderFrequencyHours(hoursLeft) {
  // Baseline: every 18h
  // Near deadline: increase frequency
  if (hoursLeft <= 0) return 0;
  if (hoursLeft <= 6) return 1; // last 6h: hourly
  if (hoursLeft <= 24) return 6; // last 24h: every 6h
  return 18;
}

function shouldSendReminder({ now, task }) {
  const due = new Date(task.date);
  const hoursLeft = hoursBetween(now, due);
  const freq = pickReminderFrequencyHours(hoursLeft);
  if (freq === 0) return { send: false, reason: "overdue", hoursLeft, freq };

  const last = task.reminderMeta?.lastReminderSentAt
    ? new Date(task.reminderMeta.lastReminderSentAt)
    : null;

  if (!last) return { send: true, reason: "first", hoursLeft, freq };

  const sinceLast = hoursBetween(last, now);
  return {
    send: sinceLast >= freq,
    reason: sinceLast >= freq ? "interval" : "too-soon",
    hoursLeft,
    freq,
  };
}

export async function processAssignmentEmailJob(job) {
  const { taskId } = job.data || {};
  if (!taskId) throw new Error("send-assignment-email missing taskId");

  const task = await Task.findById(taskId).populate({
    path: "team",
    select: "name email",
  });
  if (!task) return { ok: false, reason: "task-not-found" };
  if (!task.team?.length) return { ok: true, sent: 0 };

  await Notice.create({
    team: task.team.map((u) => u._id),
    text: `🔔 New task assigned: "${task.title}"`,
    task: task._id,
    notiType: "alert",
  });

  const due = task.date;
  const priority = task.priority;

  const results = [];
  for (const member of task.team) {
    if (!member?.email) continue;
    const { subject, text } = renderAssignedEmail({
      assigneeName: member.name,
      taskTitle: task.title,
      dueDate: due,
      priority,
    });
    await sendEmail({ to: member.email, subject, text });
    results.push(member.email);
  }

  return { ok: true, sent: results.length };
}

export async function processReminderScanJob() {
  const now = new Date();

  const tasks = await Task.find({
    isTrashed: false,
    stage: { $ne: "completed" },
    date: { $exists: true },
  }).populate({ path: "team", select: "name email" });

  let remindersSent = 0;
  let escalationsSent = 0;

  for (const task of tasks) {
    const due = new Date(task.date);
    const hoursLeft = hoursBetween(now, due);

    // Escalation: once after deadline
    if (hoursLeft <= 0) {
      const alreadyEscalated = Boolean(task.reminderMeta?.lastEscalationSentAt);
      if (!alreadyEscalated) {
        await notifyHodsOverdue({ task });
        task.reminderMeta = task.reminderMeta || {};
        task.reminderMeta.lastEscalationSentAt = now;
        await task.save();
        escalationsSent += 1;
      }
      continue;
    }

    const decision = shouldSendReminder({ now, task });
    if (!decision.send) continue;
    if (!task.team?.length) continue;

    const nearDeadline = decision.hoursLeft <= 24;
    const titlePrefix = nearDeadline ? "⏰ Deadline near" : "🔔 Reminder";
    await Notice.create({
      team: task.team.map((u) => u._id),
      text: `${titlePrefix}: "${task.title}"`,
      task: task._id,
      notiType: "alert",
    });

    for (const member of task.team) {
      if (!member?.email) continue;
      const { subject, text } = renderReminderEmail({
        assigneeName: member.name,
        taskTitle: task.title,
        dueDate: task.date,
        priority: task.priority,
        hoursLeft: decision.hoursLeft,
      });
      await sendEmail({ to: member.email, subject, text });
      remindersSent += 1;
    }

    task.reminderMeta = task.reminderMeta || {};
    task.reminderMeta.lastReminderSentAt = now;
    await task.save();
  }

  return { ok: true, remindersSent, escalationsSent, scanned: tasks.length };
}

