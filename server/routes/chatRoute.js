import express from "express";
import {
  createRoom,
  endRoomSession,
  getMyRooms,
  getRoomByKey,
} from "../controllers/chatController.js";
import { protectRoute } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/create", protectRoute, createRoom);
router.get("/my-rooms", protectRoute, getMyRooms);
router.get("/:key", protectRoute, getRoomByKey);
router.put("/end/:key", protectRoute, endRoomSession);

export default router;
