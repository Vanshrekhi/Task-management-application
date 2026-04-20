import nodemailer from "nodemailer";

const requiredEnv = ["EMAIL_HOST", "EMAIL_PORT", "EMAIL_USER", "EMAIL_PASS"];

function getMissingEnv() {
  return requiredEnv.filter((k) => !process.env[k]);
}

export function isEmailConfigured() {
  return getMissingEnv().length === 0;
}

function getTransport() {
  const port = Number(process.env.EMAIL_PORT || 587);

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

export async function sendEmail({ to, subject, text, html }) {
  const missing = getMissingEnv();
  if (missing.length) {
    throw new Error(
      `Email env missing: ${missing.join(", ")}. Set EMAIL_HOST/PORT/USER/PASS.`
    );
  }

  const transporter = getTransport();

  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;

  return transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
}

export function renderAssignedEmail({ assigneeName, taskTitle, dueDate, priority }) {
  const due = dueDate ? new Date(dueDate).toDateString() : "N/A";
  const pr = priority || "normal";

  const subject = `New task assigned: ${taskTitle}`;
  const text = `Hi ${assigneeName || "there"},\n\nA new task was assigned to you.\n\nTitle: ${taskTitle}\nPriority: ${pr}\nDue: ${due}\n\nPlease check Taskify for details.\n`;

  return { subject, text };
}

export function renderReminderEmail({
  assigneeName,
  taskTitle,
  dueDate,
  priority,
  hoursLeft,
}) {
  const due = dueDate ? new Date(dueDate).toDateString() : "N/A";
  const pr = priority || "normal";
  const left =
    typeof hoursLeft === "number" ? `${Math.max(0, Math.round(hoursLeft))}h` : "N/A";

  const subject = `Reminder: ${taskTitle} (due ${due})`;
  const text = `Hi ${assigneeName || "there"},\n\nReminder for your task.\n\nTitle: ${taskTitle}\nPriority: ${pr}\nDue: ${due}\nTime left: ${left}\n\nPlease update the task status in Taskify.\n`;

  return { subject, text };
}

export function renderEscalationEmail({ taskTitle, dueDate, teamNames }) {
  const due = dueDate ? new Date(dueDate).toDateString() : "N/A";
  const team = Array.isArray(teamNames) && teamNames.length ? teamNames.join(", ") : "N/A";

  const subject = `Overdue task escalation: ${taskTitle}`;
  const text = `Admin,\n\nThis task is overdue and needs attention.\n\nTitle: ${taskTitle}\nDue: ${due}\nAssigned team: ${team}\n\nPlease follow up in Taskify.\n`;

  return { subject, text };
}

export function renderTaskCompletedEmail({ assignerName, taskTitle, completedByName }) {
  const subject = `Task completed: ${taskTitle}`;
  const text = `Hi ${assignerName || "there"},\n\nThe task "${taskTitle}" was marked completed${
    completedByName ? ` by ${completedByName}` : ""
  }.\n\n— Taskify\n`;
  return { subject, text };
}

/** Overdue task — notify HOD (department escalation). */
export function renderHodOverdueEmail({ hodName, taskTitle, dueDate, assigneeSummary }) {
  const due = dueDate ? new Date(dueDate).toDateString() : "N/A";
  const subject = `Overdue task in your department: ${taskTitle}`;
  const text = `Hi ${hodName || "HOD"},\n\nA task in your department is overdue.\n\nTitle: ${taskTitle}\nDue: ${due}\nAssignees: ${assigneeSummary}\n\nPlease follow up in Taskify.\n`;
  return { subject, text };
}

