import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import { canManageTasksRole } from "../utils/roleHierarchy.js";

const protectRoute = asyncHandler(async (req, res, next) => {
  let token = req.cookies.token;

  if (token) {
    try {
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

      const resp = await User.findById(decodedToken.userId).select(
        "isAdmin email role department status"
      );
      if (!resp) {
        return res
          .status(401)
          .json({ status: false, message: "User not found. Please login again." });
      }

      if (resp.status && resp.status !== "approved") {
        return res.status(403).json({
          status: false,
          message: "Account is not approved. You cannot access this resource.",
        });
      }

      req.user = {
        email: resp.email,
        isAdmin: resp.isAdmin,
        role: resp.role,
        department: resp.department,
        status: resp.status,
        userId: decodedToken.userId,
      };

      next();
    } catch (error) {
      console.error(error);
      return res
        .status(401)
        .json({ status: false, message: "Not authorized. Try login again." });
    }
  } else {
    return res
      .status(401)
      .json({ status: false, message: "Not authorized. Try login again." });
  }
});

const isAdminRoute = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    return res.status(401).json({
      status: false,
      message: "Not authorized as admin. Try login as admin.",
    });
  }
};

/** Principal, HOD, or Faculty — not Student */
const canManageTasks = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ status: false, message: "Not authorized." });
  }
  if (canManageTasksRole(req.user)) {
    return next();
  }
  return res.status(403).json({
    status: false,
    message: "Students cannot create or manage tasks.",
  });
};

export { canManageTasks, isAdminRoute, protectRoute };
