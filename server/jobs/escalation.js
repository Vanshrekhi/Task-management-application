import Task from "../models/taskModel.js";
import User from "../models/userModel.js";
import Notice from "../models/notis.js";
import {
  isEmailConfigured,
  renderHodOverdueEmail,
  sendEmail,
} from "../services/emailService.js";

/**
 * After deadline: notify each department's HOD for incomplete assignees (Faculty / Student).
 */
export async function notifyHodsOverdue({ task }) {
  const populated =
    task?.team?.[0]?.email !== undefined
      ? task
      : await Task.findById(task._id).populate({
          path: "team",
          select: "name email role department",
        });

  if (!populated?.team?.length) return { sent: 0 };

  const incompleteAssignees = populated.team.filter(
    (u) => u && normalizeRole(u.role) !== "Principal" && normalizeRole(u.role) !== "HOD"
  );

  const byDept = new Map();
  for (const u of incompleteAssignees) {
    const dept = String(u.department || "").trim();
    if (!dept) continue;
    const role = normalizeRole(u.role);
    if (role !== "Faculty" && role !== "Student") continue;
    if (!byDept.has(dept)) byDept.set(dept, []);
    byDept.get(dept).push(u);
  }

  let sent = 0;
  for (const [dept, members] of byDept) {
    const hods = await User.find({
      role: "HOD",
      department: dept,
      status: "approved",
      isActive: true,
    }).select("name email");

    const assigneeSummary = members.map((m) => `${m.name} (${m.role})`).join(", ");

    for (const hod of hods) {
      await Notice.create({
        team: [hod._id],
        text: `⚠️ Overdue task in ${dept}: "${populated.title}"`,
        task: populated._id,
        notiType: "alert",
      });

      if (hod.email && isEmailConfigured()) {
        try {
          const { subject, text } = renderHodOverdueEmail({
            hodName: hod.name,
            taskTitle: populated.title,
            dueDate: populated.date,
            assigneeSummary,
          });
          await sendEmail({ to: hod.email, subject, text });
          sent += 1;
        } catch (e) {
          console.error("[email] HOD overdue failed", e?.message || e);
        }
      }
    }
  }

  return { sent };
}

function normalizeRole(r) {
  return r ? String(r).trim() : "";
}
