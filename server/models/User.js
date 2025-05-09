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
      minlength: 5,
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
        default: "",
      },
      city: {
        type: String,
        maxlength: 100,
        default: "",
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

UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(process.env.SALT_ROUNDS || 10);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.comparePassword = async function (canditatePassword) {
  const isMatch = await bcrypt.compare(canditatePassword, this.password);
  return isMatch;
};

export default mongoose.model("User", UserSchema);
