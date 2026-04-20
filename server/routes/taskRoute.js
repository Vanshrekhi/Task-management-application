import express from "express";
import {
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
} from "../controllers/taskController.js";
import { canManageTasks, protectRoute } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/create", protectRoute, canManageTasks, createTask);
router.post("/duplicate/:id", protectRoute, canManageTasks, duplicateTask);
router.post("/activity/:id", protectRoute, postTaskActivity);

router.get("/dashboard", protectRoute, dashboardStatistics);
router.get("/", protectRoute, getTasks);
router.get("/:id", protectRoute, getTask);

router.put("/create-subtask/:id", protectRoute, canManageTasks, createSubTask);
router.put("/update/:id", protectRoute, canManageTasks, updateTask);
router.put("/change-stage/:id", protectRoute, updateTaskStage);
router.put("/:id", protectRoute, canManageTasks, trashTask);

router.delete(
  "/delete-restore/:id?",
  protectRoute,
  canManageTasks,
  deleteRestoreTask
);

export default router;
