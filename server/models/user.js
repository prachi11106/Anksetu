
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },

    organisation: {
      type: String,
      required: [true, "Organisation is required"],
      trim: true,
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: undefined,
      validate: {
        validator: function (value) {
          if (!value) return true;

          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        },
        message: "Please provide a valid email address.",
      },
    },

    phone: {
      type: String,
      trim: true,
      default: undefined,
      validate: {
        validator: function (value) {
          if (!value) return true;

          return /^[0-9+\-\s()]{7,20}$/.test(value);
        },
        message: "Please provide a valid phone number.",
      },
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must contain at least 8 characters"],
    },

    role: {
      type: String,
      enum: ["teacher", "admin"],
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

// Email must be unique when provided.
userSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: {
      email: { $type: "string" },
    },
  }
);

// Phone must be unique when provided.
userSchema.index(
  { phone: 1 },
  {
    unique: true,
    partialFilterExpression: {
      phone: { $type: "string" },
    },
  }
);

const User =
  mongoose.models.User ||
  mongoose.model("User", userSchema);

export default User;
