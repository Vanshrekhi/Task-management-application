import User from "../models/userModel.js";
import Notice from "../models/notis.js";
import { renderEscalationEmail, sendEmail } from "../services/emailService.js";

export async function notifyAdminsOverdue({ task }) {
  const admins = await User.find({ isAdmin: true, isActive: true }).select(
    "name email"
  );

  const adminEmails = admins.map((a) => a.email).filter(Boolean);
  const adminIds = admins.map((a) => a._id);
  if (!adminEmails.length) return { sent: 0 };

  const { subject, text } = renderEscalationEmail({
    taskTitle: task.title,
    dueDate: task.date,
    teamNames: (task.team || []).map((u) => u?.name).filter(Boolean),
  });

  await Notice.create({
    team: adminIds,
    text: `⚠️ Task overdue: "${task.title}"`,
    task: task._id,
    notiType: "alert",
  });

  // One email to all admins (bcc can be used later if needed)
  await sendEmail({
    to: adminEmails.join(","),
    subject,
    text,
  });

  return { sent: adminEmails.length };
}

