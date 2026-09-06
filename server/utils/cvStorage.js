import localDiskProvider from "./storage/localDiskCvProvider.js";

// CV storage provider selector. Callers (controllers/jobApplicationController.js) only
// ever call cvExists()/streamCv() - never touch a filesystem path or provider directly -
// so which backend is active can change via configuration without touching calling code.
//
// CURRENT: "local" (local disk) is the only implemented provider, and the default.
//
// MIGRATION PATH to object storage (S3-compatible) - not implemented here, because no
// bucket/credentials exist to build and test against in this environment, and shipping an
// untested cloud integration would be worse than documenting the plan:
//   1. Point middlewares/fileuploader.js's multer storage engine at the bucket (e.g. via
//      multer-s3) instead of diskStorage, so uploads never touch local disk at all.
//   2. Add utils/storage/s3CvProvider.js implementing the same three-method shape as
//      localDiskCvProvider.js: exists() -> a HEAD/metadata check, stream() -> pipe the
//      object body (or redirect to a short-lived signed URL) into `res`, resolvePath() ->
//      not meaningful for object storage, can be dropped from that provider's interface.
//   3. Register it in PROVIDERS below and set CV_STORAGE_PROVIDER=s3.
//   4. Store only the object key on JobApplication.cv (already just a path-like string
//      today) - the authenticated GET /api/v1/applications/:id/cv route must remain the
//      only access path; never make the bucket/objects public.
//   5. Configure via environment variables only (e.g. CV_STORAGE_BUCKET,
//      CV_STORAGE_REGION, and provider credentials) - never hardcoded, matching every
//      other secret in this app (see .env.example).
const PROVIDERS = {
  local: localDiskProvider,
};

const resolveProvider = (providerName = process.env.CV_STORAGE_PROVIDER || "local") => {
  const provider = PROVIDERS[providerName];
  if (!provider) {
    throw new Error(
      `Unknown CV_STORAGE_PROVIDER "${providerName}". Available: ${Object.keys(PROVIDERS).join(", ")}. ` +
        `("s3" is intentionally not implemented yet - see the migration plan in this file.)`
    );
  }
  return provider;
};

// Resolved once at module load from the current environment, the same way the rest of
// the app reads startup configuration (see server.js's required-env checks).
const activeProvider = resolveProvider();

const cvExists = (storedRef) => activeProvider.exists(storedRef);
const streamCv = (storedRef, res, onError) => activeProvider.stream(storedRef, res, onError);
const resolveCvPath = (storedRef) => activeProvider.resolvePath(storedRef);
const readCvBuffer = (storedRef) => activeProvider.readBuffer(storedRef);

export { cvExists, streamCv, resolveCvPath, readCvBuffer, resolveProvider };
