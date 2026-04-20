import express from "express";
import {
  activateUserProfile,
  approveUser,
  changeUserPassword,
  deleteUserProfile,
  getPendingRequests,
  getNotificationsList,
  getTeamList,
  loginUser,
  logoutUser,
  markNotificationRead,
  rejectUser,
  registerUser,
  updateUserProfile,
} from "../controllers/userController.js";
import { isAdminRoute, protectRoute } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);

router.get("/pending-requests", protectRoute, getPendingRequests);
router.put("/approve/:id", protectRoute, approveUser);
router.put("/reject/:id", protectRoute, rejectUser);

router.get("/get-team", protectRoute, getTeamList);
router.get("/users", protectRoute, getTeamList);
router.get("/notifications", protectRoute, getNotificationsList);

router.put("/profile", protectRoute, updateUserProfile);
router.put("/read-noti", protectRoute, markNotificationRead);
router.put("/change-password", protectRoute, changeUserPassword);
//   FOR ADMIN ONLY - ADMIN ROUTES
router
  .route("/:id")
  .put(protectRoute, isAdminRoute, activateUserProfile)
  .delete(protectRoute, isAdminRoute, deleteUserProfile);

export default router;
