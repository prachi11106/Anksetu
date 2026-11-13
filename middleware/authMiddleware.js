
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";

// ======================================
// VERIFY USER AUTHENTICATION
// ======================================

export const protect = async (req, res, next) => {
  try {
    // 1. Check authorization header.
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Please login first.",
      });
    }

    const token = authHeader.substring(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is missing.",
      });
    }

    // 2. Check JWT secret.
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret || jwtSecret.length < 32) {
      console.error(
        "JWT_SECRET is missing or is too short."
      );

      return res.status(500).json({
        success: false,
        message: "Server authentication configuration error.",
      });
    }

    // 3. Verify JWT token.
    let decoded;

    try {
      decoded = jwt.verify(token, jwtSecret, {
        algorithms: ["HS256"],
      });
    } catch (error) {
      if (
        error.name === "TokenExpiredError" ||
        error.name === "JsonWebTokenError" ||
        error.name === "NotBeforeError"
      ) {
        return res.status(401).json({
          success: false,
          message: "Invalid or expired authentication token.",
        });
      }

      throw error;
    }

    // 4. Validate decoded token payload.
    if (
      !decoded ||
      typeof decoded !== "object" ||
      !decoded.userId ||
      !mongoose.isValidObjectId(decoded.userId)
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    // 5. Fetch actual user from MongoDB.
    // Never trust role or organisation from the frontend.
    const user = await User.findById(decoded.userId).select(
      "-password"
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account not found.",
      });
    }

    // 6. Check account approval and status.
    if (user.status !== "approved") {
      return res.status(403).json({
        success: false,
        message: "Your account is not approved or active.",
      });
    }

    // 7. Validate role.
    if (!["teacher", "admin"].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Invalid account role.",
      });
    }

    // 8. Validate organisation.
    if (
      typeof user.organisation !== "string" ||
      !user.organisation.trim()
    ) {
      return res.status(403).json({
        success: false,
        message: "No organisation is assigned to your account.",
      });
    }

    // 9. Attach verified user to request.
    req.user = user;

    return next();
  } catch (error) {
    console.error("Authentication middleware error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error during authentication.",
    });
  }
};

// ======================================
// CHECK USER ROLE
// ======================================

export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    // Authentication must happen first.
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Please login first.",
      });
    }

    // Check permissions using database-loaded user.
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to access this resource.",
      });
    }

    return next();
  };
};
