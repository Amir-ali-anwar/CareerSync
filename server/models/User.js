import mongoose from "mongoose";
import validator from "validator";

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide name"],
      minlength: 3,
      maxlength: 50,
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Please provide email"],
      unique: true,
      validate: {
        validator: validator.isEmail,
        message: "Please provide a valid email",
      },
    },
    password: {
      type: String,
      required: [true, "Please provide password"],
      minlength: 20,
      select: false,
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "lastName",
    },
    location: {
      country: {
        type: String,
        maxlength: 100,
        default: "India",
      },
      city: {
        type: String,
        maxlength: 100,
        default: "My City",
      },
    },
    role: {
      type: String,
      enum: ["talent", "employer"],
      required: [true, "Please select user role"],
    },
    phone: {
      type: String,
      required: [true, "Please provide phone number"],
      validate: {
        validator: function (v) {
          return validator.isMobilePhone(v + "", "any", { strictMode: false });
        },
        message: "Please provide a valid phone number",
      },
    },
    verificationToken: String,
    isVerified: {
      type: Boolean,
      default: false,
    },
    verified: Date,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", UserSchema);
