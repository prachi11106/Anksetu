
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import readline from "readline/promises";
import { stdin, stdout } from "process";
import User from "../models/User.js";

const rl = readline.createInterface({
  input: stdin,
  output: stdout,
});

async function resetAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected.\n");

    // Find the existing Admin account
    const admin = await User.findOne({ role: "admin" });

    if (!admin) {
      throw new Error("No Admin account found.");
    }

    console.log("Enter your NEW Admin details:\n");

    const fullName = await rl.question("Your full name: ");
    const organisation = await rl.question("Organisation: ");
    const emailInput = await rl.question("New email (optional): ");
    const phoneInput = await rl.question("New phone (optional): ");
    const password = await rl.question("Create a NEW password: ");

    const email = emailInput.trim().toLowerCase() || undefined;
    const phone = phoneInput.trim() || undefined;

    if (!fullName.trim() || !organisation.trim()) {
      throw new Error("Name and organisation are required.");
    }

    if (!email && !phone) {
      throw new Error("Enter at least an email or phone.");
    }

    if (password.length < 8) {
      throw new Error("Password must contain at least 8 characters.");
    }

    // Check whether another account uses these details
    const duplicate = await User.findOne({
      _id: { $ne: admin._id },
      $or: [
        ...(email ? [{ email }] : []),
        ...(phone ? [{ phone }] : []),
      ],
    });

    if (duplicate) {
      throw new Error("This email or phone is already registered.");
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    admin.fullName = fullName.trim();
    admin.organisation = organisation.trim();
    admin.email = email;
    admin.phone = phone;
    admin.password = hashedPassword;
    admin.role = "admin";
    admin.status = "approved";

    await admin.save();

    console.log("\nAdmin credentials updated successfully!");
    console.log("Admin ID:", admin._id);
    console.log("Role: admin");
    console.log("Status: approved");

  } catch (error) {
    console.error("\nReset failed:", error.message);
  } finally {
    rl.close();
    await mongoose.disconnect();
  }
}

resetAdmin();
