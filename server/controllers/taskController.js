import asyncHandler from "express-async-handler";
import Notice from "../models/notis.js";
import Task from "../models/taskModel.js";
import User from "../models/userModel.js";
import { processAssignmentEmailJob } from "../jobs/taskReminder.js";
import { enqueueAssignmentEmail } from "../queues/reminderQueue.js";
import {
  assertAssignableTeam,
  normalizeDept,
  normalizeRole,
} from "../utils/roleHierarchy.js";
import {
  isEmailConfigured,
  renderTaskCompletedEmail,
  sendEmail,
} from "../services/emailService.js";

async function maybeNotifyTaskCompleted(taskDoc, completedByUserId) {
  if (taskDoc.stage !== "completed") return;
  if (!taskDoc.createdBy) return;
  if (String(taskDoc.createdBy) === String(completedByUserId)) return;
  if (!isEmailConfigured()) return;

  const creator = await User.findById(taskDoc.createdBy).select("email name");
  if (!creator?.email) return;

  const completer = await User.findById(completedByUserId).select("name");
  const { subject, text } = renderTaskCompletedEmail({
    assignerName: creator.name,
    taskTitle: taskDoc.title,
    completedByName: completer?.name,
  });
  try {
    await sendEmail({ to: creator.email, subject, text });
  } catch (e) {
    console.error("[email] task completed notify failed", e?.message || e);
  }
}

async function safeEnqueueAssignmentEmail({ taskId, userId }) {
  try {
    await enqueueAssignmentEmail({ taskId, triggeredByUserId: userId });
  } catch (err) {
    console.error("[task] enqueueAssignmentEmail failed, sending inline", err?.message || err);
    try {
      await processAssignmentEmailJob({ data: { taskId } });
    } catch (e2) {
      console.error("[task] inline assignment email failed", e2?.message || e2);
    }
  }
}

async function validateAssigneesForCreator(creatorId, teamIds = []) {
  if (!teamIds?.length) return { ok: true };
  const creator = await User.findById(creatorId).select("name role isAdmin");
  if (!creator) {
    return { ok: false, status: 403, message: "Creator not found." };
  }
  const assignees = await User.find({ _id: { $in: teamIds } }).select(
    "name role isAdmin status isActive"
  );
  if (assignees.length !== teamIds.length) {
    return { ok: false, status: 400, message: "One or more assignees were not found." };
  }
  for (const a of assignees) {
    if (!a.isActive || a.status !== "approved") {
      return {
        ok: false,
        status: 400,
        message: `Cannot assign to ${a.name || "user"}: account is inactive or not approved.`,
      };
    }
  }
  const v = assertAssignableTeam(creator, assignees);
  if (!v.ok) return { ok: false, status: 400, message: v.message };
  return { ok: true };
}

const createTask = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.user;
    const { title, team, stage, date, priority, assets } = req.body;

    const assignCheck = await validateAssigneesForCreator(userId, team);
    if (!assignCheck.ok) {
      return res.status(assignCheck.status).json({ status: false, message: assignCheck.message });
    }

    //alert users of the task
    let text = "New task has been assigned to you";
    if (team?.length > 1) {
      text = text + ` and ${team?.length - 1} others.`;
    }

    text =
      text +
      ` The task priority is set a ${priority} priority, so check and act accordingly. The task date is ${new Date(
        date
      ).toDateString()}. Thank you!!!`;

    const activity = {
      type: "assigned",
      activity: text,
      by: userId,
    };

    const task = await Task.create({
      title,
      team,
      stage: stage.toLowerCase(),
      date,
      priority: priority.toLowerCase(),
      assets,
      activities: activity,
      createdBy: userId,
    });

    await Notice.create({
      team,
      text,
      task: task._id,
    });

    await safeEnqueueAssignmentEmail({ taskId: task._id, userId });

    res
      .status(200)
      .json({ status: true, task, message: "Task created successfully." });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
});

const duplicateTask = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ status: false, message: "Task not found." });
    }

    const assignCheck = await validateAssigneesForCreator(userId, task.team || []);
    if (!assignCheck.ok) {
      return res.status(assignCheck.status).json({ status: false, message: assignCheck.message });
    }

    //alert users of the task
    let text = "New task has been assigned to you";
    if (task.team?.length > 1) {
      text = text + ` and ${task.team.length - 1} others.`;
    }

    text =
      text +
      ` The task priority is set a ${
        task.priority
      } priority, so check and act accordingly. The task date is ${new Date(
        task.date
      ).toDateString()}. Thank you!!!`;

    const activity = {
      type: "assigned",
      activity: text,
      by: userId,
    };

    const newTask = await Task.create({
      title: "Duplicate - " + task.title,
      team: task.team,
      subTasks: task.subTasks || [],
      assets: task.assets || [],
      priority: task.priority,
      stage: task.stage,
      date: task.date,
      activities: activity,
      createdBy: userId,
      reminderMeta: task.reminderMeta || {},
      isTrashed: false,
    });

    await Notice.create({
      team: newTask.team,
      text,
      task: newTask._id,
    });

    await safeEnqueueAssignmentEmail({ taskId: newTask._id, userId });

    res
      .status(200)
      .json({ status: true, message: "Task duplicated successfully." });
  } catch (error) {
    return res.status(400).json({ status: false, message: error.message });
  }
});

const updateTask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId } = req.user;
  const { title, date, team, stage, priority, assets } = req.body;

  try {
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ status: false, message: "Task not found." });
    }

    const prevTeam = (task.team || []).map(String).sort().join(",");
    const nextTeam = (team || []).map(String).sort().join(",");

    if (prevTeam !== nextTeam) {
      const assignCheck = await validateAssigneesForCreator(userId, team);
      if (!assignCheck.ok) {
        return res.status(assignCheck.status).json({ status: false, message: assignCheck.message });
      }
    }

    const prevStage = String(task.stage || "").toLowerCase();

    task.title = title;
    task.date = date;
    task.priority = priority.toLowerCase();
    task.assets = assets;
    task.stage = stage.toLowerCase();
    task.team = team;
    if (!task.createdBy) {
      task.createdBy = userId;
    }

    await task.save();

    if (prevTeam !== nextTeam) {
      await safeEnqueueAssignmentEmail({ taskId: task._id, userId });
    }

    if (prevStage !== "completed" && task.stage === "completed") {
      await maybeNotifyTaskCompleted(task, userId);
    }

    res.status(200).json({ status: true, message: "Task updated successfully." });
  } catch (error) {
    return res.status(400).json({ status: false, message: error.message });
  }
});

const updateTaskStage = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const { stage } = req.body;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ status: false, message: "Task not found." });
    }

    const prevStage = String(task.stage || "").toLowerCase();
    task.stage = stage.toLowerCase();

    await task.save();

    if (prevStage !== "completed" && task.stage === "completed") {
      await maybeNotifyTaskCompleted(task, userId);
    }

    res
      .status(200)
      .json({ status: true, message: "Task stage changed successfully." });
  } catch (error) {
    return res.status(400).json({ status: false, message: error.message });
  }
});

const createSubTask = asyncHandler(async (req, res) => {
  const { title, tag, date } = req.body;
  const { id } = req.params;

  try {
    const newSubTask = {
      title,
      date,
      tag,
    };

    const task = await Task.findById(id);

    task.subTasks.push(newSubTask);

    await task.save();

    res
      .status(200)
      .json({ status: true, message: "SubTask added successfully." });
  } catch (error) {
    return res.status(400).json({ status: false, message: error.message });
  }
});

const getTasks = asyncHandler(async (req, res) => {
  const { userId, isAdmin, role, department } = req.user;
  const { stage, isTrashed, search } = req.query;

  const r = normalizeRole(role);
  const isPrincipal = isAdmin || r === "Principal";

  let query = { isTrashed: isTrashed ? true : false };

  if (!isPrincipal) {
    if (r === "HOD") {
      const dept = normalizeDept(department);
      const deptUserIds = await User.find({
        department: dept,
        status: "approved",
      }).distinct("_id");
      query.$or = [
        { team: userId },
        { createdBy: userId },
        { team: { $in: deptUserIds } },
        { createdBy: { $in: deptUserIds } },
      ];
    } else if (r === "Faculty") {
      query.$or = [{ team: userId }, { createdBy: userId }];
    } else {
      query.team = userId;
    }
  }

  if (stage) {
    query.stage = stage;
  }

  if (search) {
    const searchQuery = {
      $or: [
        { title: { $regex: search, $options: "i" } },
        { stage: { $regex: search, $options: "i" } },
        { priority: { $regex: search, $options: "i" } },
      ],
    };
    query = { $and: [query, searchQuery] };
  }

  const tasks = await Task.find(query)
    .populate({
      path: "team",
      select: "name title email role department",
    })
    .populate({ path: "createdBy", select: "name email" })
    .sort({ _id: -1 });

  res.status(200).json({
    status: true,
    tasks,
  });
});

const getTask = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id)
      .populate({
        path: "team",
        select: "name title role email department",
      })
      .populate({ path: "createdBy", select: "name email" })
      .populate({
        path: "activities.by",
        select: "name",
      });

    res.status(200).json({
      status: true,
      task,
    });
  } catch (error) {
    console.log(error);
    throw new Error("Failed to fetch task", error);
  }
});

const postTaskActivity = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId } = req.user;
  const { type, activity } = req.body;

  try {
    const task = await Task.findById(id);

    const data = {
      type,
      activity,
      by: userId,
    };
    task.activities.push(data);

    await task.save();

    res
      .status(200)
      .json({ status: true, message: "Activity posted successfully." });
  } catch (error) {
    return res.status(400).json({ status: false, message: error.message });
  }
});

const trashTask = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const task = await Task.findById(id);

    task.isTrashed = true;

    await task.save();

    res.status(200).json({
      status: true,
      message: `Task trashed successfully.`,
    });
  } catch (error) {
    return res.status(400).json({ status: false, message: error.message });
  }
});

const deleteRestoreTask = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { actionType } = req.query;

    if (actionType === "delete") {
      await Task.findByIdAndDelete(id);
    } else if (actionType === "deleteAll") {
      await Task.deleteMany({ isTrashed: true });
    } else if (actionType === "restore") {
      const resp = await Task.findById(id);

      resp.isTrashed = false;

      resp.save();
    } else if (actionType === "restoreAll") {
      await Task.updateMany(
        { isTrashed: true },
        { $set: { isTrashed: false } }
      );
    }

    res.status(200).json({
      status: true,
      message: `Operation performed successfully.`,
    });
  } catch (error) {
    return res.status(400).json({ status: false, message: error.message });
  }
});

const dashboardStatistics = asyncHandler(async (req, res) => {
  try {
    const { userId, isAdmin, role, department } = req.user;
    const r = normalizeRole(role);
    const isPrincipal = isAdmin || r === "Principal";

    let taskQuery = { isTrashed: false };
    if (!isPrincipal) {
      if (r === "HOD") {
        const dept = normalizeDept(department);
        const deptUserIds = await User.find({
          department: dept,
          status: "approved",
        }).distinct("_id");
        taskQuery.$or = [
          { team: userId },
          { createdBy: userId },
          { team: { $in: deptUserIds } },
          { createdBy: { $in: deptUserIds } },
        ];
      } else if (r === "Faculty") {
        taskQuery.$or = [{ team: userId }, { createdBy: userId }];
      } else {
        taskQuery.team = userId;
      }
    }

    const allTasks = await Task.find(taskQuery)
      .populate({
        path: "team",
        select: "name role title email department",
      })
      .sort({ _id: -1 });

    let usersQuery = { isActive: true, status: "approved" };
    if (isPrincipal) {
      // recent org members
    } else if (r === "HOD") {
      usersQuery.department = normalizeDept(department);
    } else if (r === "Faculty") {
      usersQuery.department = normalizeDept(department);
      usersQuery.role = "Student";
    } else {
      usersQuery = { _id: userId };
    }

    const users = await User.find(usersQuery)
      .select("name title role isActive createdAt department")
      .limit(10)
      .sort({ _id: -1 });

    // Group tasks by stage and calculate counts
    const groupedTasks = allTasks?.reduce((result, task) => {
      const stage = task.stage;

      if (!result[stage]) {
        result[stage] = 1;
      } else {
        result[stage] += 1;
      }

      return result;
    }, {});

    const graphData = Object.entries(
      allTasks?.reduce((result, task) => {
        const { priority } = task;
        result[priority] = (result[priority] || 0) + 1;
        return result;
      }, {})
    ).map(([name, total]) => ({ name, total }));

    // Calculate total tasks
    const totalTasks = allTasks.length;
    const last10Task = allTasks?.slice(0, 10);

    // Combine results into a summary object
    const summary = {
      totalTasks,
      last10Task,
      users: isPrincipal ? users : r === "HOD" || r === "Faculty" ? users : [],
      tasks: groupedTasks,
      graphData,
    };

    res
      .status(200)
      .json({ status: true, ...summary, message: "Successfully." });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ status: false, message: error.message });
  }
});

export {
  createSubTask,
  createTask,
  dashboardStatistics,
  deleteRestoreTask,
  duplicateTask,
  getTask,
  getTasks,
  postTaskActivity,
  trashTask,
  updateTask,
  updateTaskStage,
};
