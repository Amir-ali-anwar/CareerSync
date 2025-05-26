import mongoose from "mongoose";

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    logo: {
      type: String,
    },
    website: {
      type: String,
    },
    emailDomain: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
    },
    description: {
      type: String,
      required: true,
    },
    mission: {
      type: String,
    },
    culture: {
      type: String,
    },
    foundedYear: {
      type: Number,
    },
    industry: {
      type: String,
      required: true,
    },
    companySize: {
      type: String,
      enum: ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"],
      required: true,
    },
    hqLocation: {
      type: String,
      required: true,
    },
    locations: [String],
    organizationType: {
      type: String,
      enum: [
        "Private",
        "Public",
        "Non-Profit",
        "Startup",
        "Government",
        "Other",
      ],
    },
    hiringContactEmail: {
      type: String,
      required: true,
    },
    careersPage: {
      type: String,
    },
    socialLinks: {
      linkedin: String,
      twitter: String,
      facebook: String,
      glassdoor: String,
    },
    officePhotos: [String],
    coverImage: {
      type: String,
    },
    introVideo: {
      type: String,
    },
    awards: [String],
    followers: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        followedAt: { type: Date, default: Date.now },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);


export default mongoose.model("Organization", organizationSchema);
