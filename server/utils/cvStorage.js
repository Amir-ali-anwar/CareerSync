import path from "path";
import fs from "fs";

// Storage abstraction for uploaded CVs. Callers (controllers/jobApplicationController.js)
// only ever call cvExists()/streamCv() - never touch a filesystem path directly - so the
// implementation behind this module can change without touching any calling code.
//
// CURRENT: local disk, same location middlewares/fileuploader.js writes to. This does
// NOT work for a horizontally-scaled deployment (an instance that didn't handle the
// upload can't see the file), so it should not be treated as the long-term answer.
//
// MIGRATION PATH (not implemented here - no bucket/credentials exist to build and test
// against in this environment, and shipping an untested cloud integration would be worse
// than documenting the plan):
//   1. Point middlewares/fileuploader.js's multer storage engine at an S3-compatible
//      bucket (e.g. via multer-s3) instead of diskStorage, so uploads never touch local
//      disk in the first place.
//   2. Replace this module's three functions with equivalents backed by the storage
//      SDK: cvExists -> a HEAD/metadata check, streamCv -> pipe the object body (or
//      redirect to a short-lived signed URL) into `res` instead of `res.sendFile`.
//   3. Store only the object key on JobApplication.cv (already just a path-like string
//      today), not a public URL - the authenticated GET /api/v1/applications/:id/cv
//      route must remain the only access path; never make the bucket/objects public.
//   4. Configuration via environment variables only (e.g. CV_STORAGE_BUCKET,
//      CV_STORAGE_REGION, and provider credentials) - never hardcoded, matching how
//      every other secret in this app is handled (see .env.example).
const CV_STORAGE_ROOT = path.join(process.cwd(), "uploads", "cvs");

// `storedCvPath` is the value saved on a JobApplication, e.g. "/uploads/cvs/172...-abc.pdf".
// Reducing it to its basename means a malformed or tampered value can never escape the
// CV directory (path traversal), regardless of what the stored string contains.
const resolveCvPath = (storedCvPath) => path.join(CV_STORAGE_ROOT, path.basename(storedCvPath));

const cvExists = (storedCvPath) => {
  if (!storedCvPath) return false;
  return fs.existsSync(resolveCvPath(storedCvPath));
};

const streamCv = (storedCvPath, res, onError) => {
  res.sendFile(resolveCvPath(storedCvPath), (err) => {
    if (err && !res.headersSent) onError(err);
  });
};

export { resolveCvPath, cvExists, streamCv };
