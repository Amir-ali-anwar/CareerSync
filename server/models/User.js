import mongoose from "mongoose";
import validator from "validator";
import JobsModal from "./JobsModel.js";
import JobApplicationModal from "./JobApplicationModel.js";
import bcrypt from "bcryptjs";
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
      lowercase: true,
      validate: {
        validator: validator.isEmail,
        message: "Please provide a valid email",
      },
    },
    profileImage: {
      type: String,
      default: function () {
        const encodedName = encodeURIComponent(this.name || "User");
        return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodedName}`;
      },
    },
    password: {
      type: String,
      // Google-only accounts have no local password to check against.
      required: function () {
        return !this.googleId;
      },
      minlength: [8, "Password must be at least 8 characters"],
      validate: {
        validator: function (v) {
          // Only applies when a password is actually being set (Google-only accounts
          // never populate this field, and Mongoose skips validators for undefined paths).
          if (!v) return true;
          return /[a-zA-Z]/.test(v) && /\d/.test(v);
        },
        message: "Password must contain at least one letter and one number",
      },
      select: false,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
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
        required: [true, "Country is required"],
      },
      city: {
        type: String,
        required: [true, "City is required"],
      },
    },
    role: {
      type: String,
      enum: {
        values: ["talent", "employer"],
        message: "Role must be either 'talent' or 'employer'",
      },
      required: [true, "Please select user role"],
    },
    phone: {
      type: String,
      required: [true, "Please provide phone number"],
      validate: {
        validator: function (v) {
          return validator.isMobilePhone(v + "", "any", {
            strictMode: false,
          });
        },
        message: "Please provide a valid phone number",
      },
    },
    companyName: {
      type: String,
      required: function () {
        return this.role === "employer";
      },
    },
    companySize: {
      type: String,
      required: function () {
        return this.role === "employer";
      },
    },
    industry: {
      type: String,
      required: function () {
        return this.role === "employer";
      },
    },
    // Holds a 6-digit OTP (not a link token) - see utils/otp.js. Same field name kept
    // to minimize churn even though the format changed.
    verificationToken: {
      type: String,
    },
    verificationTokenExpires: Date,
    // Wrong-code guesses against the current OTP; reset to 0 whenever a fresh code is
    // issued (register/resend). Once this crosses MAX_OTP_ATTEMPTS the code is treated
    // as burned - the user must request a new one - so a 6-digit space can't be brute-forced
    // within its 10-minute lifetime.
    verificationAttempts: {
      type: Number,
      default: 0,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verified: {
      type: Date,
    },
    // Also a 6-digit OTP now, same reasoning as verificationToken above.
    passwordResetToken: {
      type: String,
    },
    passwordResetTokenExpires: Date,
    passwordResetAttempts: {
      type: Number,
      default: 0,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      select: false,
    },
    twoFactorBackupCodes: {
      type: [String],
      select: false,
      default: undefined,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);
UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const saltRounds = parseInt(process.env.SALT_ROUNDS, 10) || 10;

  const salt = await bcrypt.genSalt(saltRounds);
  this.password = await bcrypt.hash(this.password, salt);
});
UserSchema.post("findOneAndDelete", async (doc) => {
  if (doc) {
    if (doc.role === "employer") {
      await JobsModal.deleteMany({ createdBy: doc._id });
    }
    if (doc.role === "talent") {
      await JobApplicationModal.deleteMany({ talent: doc._id });
    }
  }
});

UserSchema.methods.comparePassword = async function (canditatePassword) {
  // Google-only accounts (no local password set) can never match a password login.
  if (!this.password) return false;
  const isMatch = await bcrypt.compare(canditatePassword, this.password);
  return isMatch;
};

export default mongoose.model("User", UserSchema);
