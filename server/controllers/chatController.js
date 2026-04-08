import asyncHandler from "express-async-handler";
import ChatRoom from "../models/chatRoomModel.js";

const generateRoomKeyString = () =>
  `ROOM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const sanitizeRoom = (room) => ({
  _id: room._id,
  key: room.key,
  host: room.host,
  teamMembers: room.teamMembers,
  isActive: room.isActive,
  endedAt: room.endedAt,
  createdAt: room.createdAt,
});

const createRoom = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { invitedMembers = [] } = req.body;

  let key = generateRoomKeyString();
  while (await ChatRoom.findOne({ key })) {
    key = generateRoomKeyString();
  }

  const uniqueMembers = [...new Set(invitedMembers.map(String))].filter(
    (id) => id !== String(userId)
  );

  const room = await ChatRoom.create({
    key,
    host: userId,
    teamMembers: uniqueMembers.map((id) => ({
      user: id,
      status: "pending",
    })),
  });

  const populated = await ChatRoom.findById(room._id)
    .populate("host", "name email")
    .populate("teamMembers.user", "name email title role");

  res.status(201).json({
    status: true,
    message: "Chat room key generated successfully.",
    room: sanitizeRoom(populated),
  });
});

const getMyRooms = asyncHandler(async (req, res) => {
  const { userId } = req.user;

  const rooms = await ChatRoom.find({
    $or: [{ host: userId }, { "teamMembers.user": userId }],
  })
    .populate("host", "name email")
    .populate("teamMembers.user", "name email title role")
    .sort({ _id: -1 });

  res.status(200).json({ status: true, rooms: rooms.map(sanitizeRoom) });
});

const getRoomByKey = asyncHandler(async (req, res) => {
  const { key } = req.params;
  const room = await ChatRoom.findOne({ key })
    .populate("host", "name email")
    .populate("teamMembers.user", "name email title role");

  if (!room) {
    return res
      .status(404)
      .json({ status: false, message: "Chat room not found for this key." });
  }

  res.status(200).json({ status: true, room: sanitizeRoom(room) });
});

const endRoomSession = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  const { key } = req.params;

  const room = await ChatRoom.findOne({ key });
  if (!room) {
    return res.status(404).json({ status: false, message: "Chat room not found." });
  }

  if (String(room.host) !== String(userId)) {
    return res
      .status(403)
      .json({ status: false, message: "Only room host can end this chat session." });
  }

  room.messages = [];
  room.isActive = false;
  room.endedAt = new Date();
  await room.save();

  res.status(200).json({
    status: true,
    message: "Chat session ended and messages removed successfully.",
  });
});

export { createRoom, endRoomSession, getMyRooms, getRoomByKey };
