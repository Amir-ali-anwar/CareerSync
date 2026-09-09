import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["application_submitted", "application_status_changed"],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    link: {
      type: String,
    },
    read: {
      type: Boolean,
      default: false,
    },
    // Free-form context for the frontend to key off (jobId, applicationId, status, ...) -
    // never used for authorization, only display/navigation.
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

// Every read path filters by user and most sort by recency; unread-count queries also
// filter by read - one compound index covers all three shapes.
NotificationSchema.index({ user: 1, read: 1, createdAt: -1 });

export default mongoose.model("Notification", NotificationSchema);
