import express from "express";
import {
  approveUser,
  getPendingRequests,
  loginUser,
  logoutUser,
  rejectUser,
  registerUser,
} from "../controllers/userController.js";
import { protectRoute } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);

router.get("/pending-requests", protectRoute, getPendingRequests);
router.put("/approve/:id", protectRoute, approveUser);
router.put("/reject/:id", protectRoute, rejectUser);

export default router;

