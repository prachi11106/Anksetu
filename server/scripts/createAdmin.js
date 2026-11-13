
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import User from "../models/User.js";

// ==========================================
// CREATE INITIAL ADMIN ACCOUNT
// ==========================================

const createAdmin = async () => {
  let connected = false;

  try {
    const {
      MONGODB_URI,
      ADMIN_NAME,
      ADMIN_ORGANISATION,
      ADMIN_EMAIL,
      ADMIN_PHONE,
      ADMIN_PASSWORD,
    } = process.env;

    // 1. Validate environment configuration.

    if (
      !MONGODB_URI ||
      !ADMIN_NAME?.trim() ||
      !ADMIN_ORGANISATION?.trim() ||
      !ADMIN_PASSWORD
    ) {
      throw new Error(
        "Please provide MONGODB_URI, ADMIN_NAME, ADMIN_ORGANISATION and ADMIN_PASSWORD."
      );
    }

    if (!ADMIN_EMAIL?.trim() && !ADMIN_PHONE?.trim()) {
      throw new Error(
        "Provide at least an Admin email or phone number."
      );
    }

    if (ADMIN_PASSWORD.length < 8) {
      throw new Error(
        "Admin password must contain at least 8 characters."
      );
    }

    if (
      Buffer.byteLength(ADMIN_PASSWORD, "utf8") > 72
    ) {
      throw new Error(
        "Admin password must not exceed 72 bytes."
      );
    }

    const cleanName = ADMIN_NAME.trim();
    const cleanOrganisation = ADMIN_ORGANISATION.trim();

    const email = ADMIN_EMAIL?.trim()
      ? ADMIN_EMAIL.trim().toLowerCase()
      : undefined;

    const phone = ADMIN_PHONE?.trim()
      ? ADMIN_PHONE.trim()
      : undefined;

    // 2. Connect to MongoDB.

    await mongoose.connect(MONGODB_URI);
    connected = true;

    console.log("MongoDB connected.");

    // 3. Check whether an initial admin already exists
    // in this organisation.

    const existingAdmin = await User.findOne({
      role: "admin",
      organisation: cleanOrganisation,
    });

    if (existingAdmin) {
      console.log(
        "An Admin account already exists for this organisation."
      );

      console.log("Admin setup cancelled.");
      return;
    }

    // 4. Check whether email or phone is already registered.

    const contactConditions = [];

    if (email) {
      contactConditions.push({ email });
    }

    if (phone) {
      contactConditions.push({ phone });
    }

    const existingUser = await User.findOne({
      $or: contactConditions,
    });

    if (existingUser) {
      throw new Error(
        "This email or phone number is already registered."
      );
    }

    // 5. Hash admin password.

    const hashedPassword = await bcrypt.hash(
      ADMIN_PASSWORD,
      12
    );

    // 6. Create approved admin account.

    const admin = await User.create({
      fullName: cleanName,
      organisation: cleanOrganisation,
      email,
      phone,
      password: hashedPassword,
      role: "admin",
      status: "approved",
    });

    // 7. Display confirmation.

    console.log("\nAdmin account created successfully!");
    console.log("--------------------------------");
    console.log("Admin ID:", admin._id);
    console.log("Name:", admin.fullName);
    console.log("Organisation:", admin.organisation);
    console.log("Role:", admin.role);
    console.log("Status:", admin.status);
    console.log("--------------------------------");
  } catch (error) {
    console.error(
      "Admin setup failed:",
      error.message
    );

    process.exitCode = 1;
  } finally {
    // 8. Close MongoDB connection.

    if (connected) {
      await mongoose.disconnect();
      console.log("MongoDB connection closed.");
    }
  }
};

createAdmin();
