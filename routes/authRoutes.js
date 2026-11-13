
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import User from "../models/User.js";

const router = express.Router();

// ==========================================
// HELPER: CHECK JWT CONFIGURATION
// ==========================================

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    return null;
  }

  return secret;
};

// ==========================================
// TEACHER SIGNUP
// POST /api/auth/signup
//
// Public registration is only for teachers.
// Admin accounts are created separately.
// ==========================================

router.post("/signup", async (req, res) => {
  try {
    const {
      fullName,
      organisation,
      email,
      phone,
      password,
      confirmPassword,
    } = req.body;

    // 1. Validate required fields.

    if (
      typeof fullName !== "string" ||
      typeof organisation !== "string" ||
      typeof password !== "string" ||
      typeof confirmPassword !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required details.",
      });
    }

    const cleanName = fullName.trim();
    const cleanOrganisation = organisation.trim();

    if (!cleanName || !cleanOrganisation) {
      return res.status(400).json({
        success: false,
        message: "Name and organisation cannot be empty.",
      });
    }

    if (
      cleanName.length > 100 ||
      cleanOrganisation.length > 150
    ) {
      return res.status(400).json({
        success: false,
        message: "Name or organisation is too long.",
      });
    }

    // 2. Normalise contact details.

    const cleanEmail =
      typeof email === "string" && email.trim()
        ? email.trim().toLowerCase()
        : undefined;

    const cleanPhone =
      typeof phone === "string" && phone.trim()
        ? phone.trim()
        : undefined;

    if (!cleanEmail && !cleanPhone) {
      return res.status(400).json({
        success: false,
        message: "Enter an email address or phone number.",
      });
    }

    // 3. Validate password.

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least 8 characters.",
      });
    }

    // bcrypt uses a maximum of 72 bytes of password input.
    if (Buffer.byteLength(password, "utf8") > 72) {
      return res.status(400).json({
        success: false,
        message:
          "Password must not exceed 72 bytes.",
      });
    }

    // 4. Check existing email or phone.

    const contactConditions = [];

    if (cleanEmail) {
      contactConditions.push({
        email: cleanEmail,
      });
    }

    if (cleanPhone) {
      contactConditions.push({
        phone: cleanPhone,
      });
    }

    const existingUser = await User.findOne({
      $or: contactConditions,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "An account with this email or phone already exists.",
      });
    }

    // 5. Hash password.

    const hashedPassword = await bcrypt.hash(
      password,
      12
    );

    // 6. Create teacher account.

    const newUser = await User.create({
      fullName: cleanName,
      organisation: cleanOrganisation,
      email: cleanEmail,
      phone: cleanPhone,
      password: hashedPassword,

      // Public signup cannot create administrators.
      role: "teacher",

      // Admin approval is required before login.
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      message:
        "Registration successful. Wait for administrator approval.",

      user: {
        id: newUser._id,
        fullName: newUser.fullName,
        organisation: newUser.organisation,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        status: newUser.status,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "This email or phone number is already registered.",
      });
    }

    if (
      error.name === "ValidationError" ||
      error.name === "CastError"
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error during registration.",
    });
  }
});

// ==========================================
// LOGIN
// POST /api/auth/login
//
// Teacher and admin login.
// ==========================================

router.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // 1. Validate input.

    if (
      typeof identifier !== "string" ||
      typeof password !== "string" ||
      !identifier.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter your email/phone and password.",
      });
    }

    const cleanIdentifier = identifier.trim();

    const normalizedIdentifier =
      cleanIdentifier.toLowerCase();

    // 2. Find user using email or phone.

    const user = await User.findOne({
      $or: [
        {
          email: normalizedIdentifier,
        },
        {
          phone: cleanIdentifier,
        },
      ],
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email/phone or password.",
      });
    }

    // 3. Verify password.

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email/phone or password.",
      });
    }

    // 4. Check account approval.

    if (user.status === "pending") {
      return res.status(403).json({
        success: false,
        message:
          "Your account is waiting for administrator approval.",
      });
    }

    if (user.status === "rejected") {
      return res.status(403).json({
        success: false,
        message:
          "Your registration was not approved. Contact your administrator.",
      });
    }

    if (user.status !== "approved") {
      return res.status(403).json({
        success: false,
        message:
          "Your account is not active. Contact your administrator.",
      });
    }

    // 5. Validate role.

    if (!["teacher", "admin"].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message:
          "Your account does not have a valid role.",
      });
    }

    // 6. Validate organisation.

    if (
      typeof user.organisation !== "string" ||
      !user.organisation.trim()
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Your account does not have an organisation assigned.",
      });
    }

    // 7. Validate JWT secret.

    const jwtSecret = getJwtSecret();

    if (!jwtSecret) {
      console.error(
        "JWT_SECRET is missing or shorter than 32 characters."
      );

      return res.status(500).json({
        success: false,
        message:
          "Authentication configuration error.",
      });
    }

    // 8. Generate JWT token.

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        role: user.role,
      },
      jwtSecret,
      {
        algorithm: "HS256",
        expiresIn: "1d",
      }
    );

    // 9. Send login response.

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,

      user: {
        id: user._id,
        fullName: user.fullName,
        organisation: user.organisation,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error during login.",
    });
  }
});

export default router;
