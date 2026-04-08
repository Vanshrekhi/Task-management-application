import mongoose, { Schema } from "mongoose";

const chatRoomSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    host: { type: Schema.Types.ObjectId, ref: "User", required: true },
    teamMembers: [
      {
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        status: {
          type: String,
          enum: ["pending", "accepted", "rejected"],
          default: "pending",
        },
        requestedAt: { type: Date, default: Date.now },
        respondedAt: { type: Date, default: null },
      },
    ],
    messages: [
      {
        sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
        text: { type: String, required: true, trim: true },
        sentAt: { type: Date, default: Date.now },
      },
    ],
    isActive: { type: Boolean, default: true },
    endedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const ChatRoom = mongoose.model("ChatRoom", chatRoomSchema);

export default ChatRoom;
