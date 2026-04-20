import bcrypt from "bcryptjs";
import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    title: { type: String, default: "" },
    role: {
      type: String,
      required: true,
      enum: ["Principal", "HOD", "Faculty", "Student", "Member"],
      default: "Member",
    },
    department: { type: String, default: "" },
    year: { type: String, default: "" },
    section: { type: String, default: "" },
    rollNo: { type: String, default: "" },
    prn: { type: String, unique: true, sparse: true },
    facultyRole: {
      type: String,
      enum: ["Faculty", "Student Incharge", "Project Guide", ""],
      default: "",
    },
    subjectsSkills: [{ type: String }],
    email: { type: String, unique: true, sparse: true },
    password: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    approvedAt: { type: Date, default: null },
    tasks: [{ type: Schema.Types.ObjectId, ref: "Task" }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;
