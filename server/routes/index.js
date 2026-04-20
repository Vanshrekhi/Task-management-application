import express from "express";
import authRoutes from "./authRoute.js";
import userRoutes from "./userRoute.js";
import taskRoutes from "./taskRoute.js";
import chatRoutes from "./chatRoute.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/user", userRoutes);
router.use("/task", taskRoutes);
router.use("/chat", chatRoutes);

export default router;
