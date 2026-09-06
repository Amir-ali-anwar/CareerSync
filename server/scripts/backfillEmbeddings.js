import connectDB from "../db/connect.js";
import CandidateProfileModel from "../models/CandidateProfileModel.js";
import JobProfileModel from "../models/JobProfileModel.js";
import { embedCandidateProfile, embedJobProfile, vectorStore } from "../services/embeddings/embeddingService.js";

const run = async () => {
  await connectDB(process.env.MONGO_URL || process.env.MONGO_URI);
  await vectorStore.initialize();
  const [candidates, jobs] = await Promise.all([
    CandidateProfileModel.find({ processingStatus: "completed" }).select("user"),
    JobProfileModel.find({ processingStatus: "completed" }).select("job"),
  ]);
  for (const profile of candidates) await embedCandidateProfile(profile.user);
  for (const profile of jobs) await embedJobProfile(profile.job);
  console.log(`Embedding backfill complete: ${candidates.length} candidates, ${jobs.length} jobs.`);
  process.exit(0);
};

run().catch((error) => {
  console.error(`Embedding backfill failed: ${error.message}`);
  process.exit(1);
});