import path from "path";
import fs from "fs";

// The "local disk" CV storage provider - reads from the same location
// middlewares/fileuploader.js writes uploads to. This is the CURRENT provider, selected
// by default (see ../cvStorage.js), but does NOT work for a horizontally-scaled
// deployment: an instance that didn't handle the original upload can't see the file.
const CV_STORAGE_ROOT = path.join(process.cwd(), "uploads", "cvs");

// `storedRef` is the value saved on JobApplication.cv, e.g. "/uploads/cvs/172...-abc.pdf".
// Reducing it to its basename means a malformed or tampered value can never escape the
// CV directory (path traversal), regardless of what the stored string contains.
const resolvePath = (storedRef) => path.join(CV_STORAGE_ROOT, path.basename(storedRef));

const exists = (storedRef) => {
  if (!storedRef) return false;
  return fs.existsSync(resolvePath(storedRef));
};

const stream = (storedRef, res, onError) => {
  res.sendFile(resolvePath(storedRef), (err) => {
    if (err && !res.headersSent) onError(err);
  });
};

// Used by resume text extraction (services/resume) to read the CV's raw bytes without
// going through an HTTP response - the only other consumer of a CV's contents besides
// the authenticated download route, and still routed through this same abstraction
// rather than touching the filesystem directly.
const readBuffer = (storedRef) => fs.promises.readFile(resolvePath(storedRef));

export default { name: "local", exists, stream, resolvePath, readBuffer };
