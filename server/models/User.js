import mongoose from "mongoose";
import validator from "validator";
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
      required: [true, "Please provide password"],
      minlength: [5, "Password must be at least 5 characters"],
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
    verificationToken: {
      type: String,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verified: {
      type: Date,
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

  // Ensure SALT_ROUNDS is parsed properly as an integer
  const saltRounds = parseInt(process.env.SALT_ROUNDS, 10);
  if (isNaN(saltRounds)) {
    throw new Error("Invalid SALT_ROUNDS value in environment variables");
  }

  const salt = await bcrypt.genSalt(saltRounds);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.comparePassword = async function (canditatePassword) {
  const isMatch = await bcrypt.compare(canditatePassword, this.password);
  return isMatch;
};

export default mongoose.model("User", UserSchema);
