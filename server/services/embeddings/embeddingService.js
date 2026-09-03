import crypto from "crypto";
import CandidateProfileModel from "../../models/CandidateProfileModel.js";
import JobProfileModel from "../../models/JobProfileModel.js";
import JobModel from "../../models/JobsModel.js";
import aiService from "../ai/index.js";
import { embeddingConfig } from "./embeddingConfig.js";
import { candidateEmbeddingText, jobEmbeddingText } from "./embeddingTextBuilders.js";
import { MongoVectorStore } from "./mongoVectorStore.js";
import logger from "../../utils/logger.js";

const vectorStore = new MongoVectorStore();
const hashContent = (content) => crypto.createHash("sha256").update(content).digest("hex");
const validVector = (vector, expectedDimensions) =>
  Array.isArray(vector) && vector.length > 0 && vector.every((value) => Number.isFinite(value)) &&
  (!expectedDimensions || vector.length === expectedDimensions);

const embedCandidateProfile = async (userId) => {
  const profile = await CandidateProfileModel.findOne({ user: userId }).select("+resumeText +embedding");
  if (!profile || profile.processingStatus !== "completed") return { status: "skipped" };
  const config = embeddingConfig();
  const content = candidateEmbeddingText(profile);
  const contentHash = hashContent(content);
  if (profile.embeddingMetadata?.contentHash === contentHash && profile.embeddingMetadata?.embeddingVersion === config.version && profile.embeddingMetadata?.embeddingModel === config.model) {
    return { status: "unchanged" };
  }
  const startedAt = Date.now();
  try {
    const result = await aiService.generateEmbedding(content);
    if (!validVector(result.vector, config.dimensions)) throw new Error("Invalid embedding vector returned by provider");
    await vectorStore.upsert({
      sourceType: "candidate",
      sourceId: profile.user,
      vector: result.vector,
      metadata: { sourceType: "candidate", sourceId: String(profile.user), sourceVersion: profile.profileVersion, embeddingModel: result.model, embeddingVersion: config.version, dimensions: result.dimensions, contentHash, generatedAt: new Date() },
    });
    logger.info("embedding_completed", { sourceType: "candidate", sourceId: String(profile.user), model: result.model, version: config.version, durationMs: Date.now() - startedAt });
    return { status: "completed" };
  } catch (error) {
    logger.warn("embedding_failed", { sourceType: "candidate", sourceId: String(profile.user), model: config.model, version: config.version, errorName: error.name });
    return { status: "failed", reason: error.name };
  }
};

const embedJobProfile = async (jobId) => {
  const [job, profile] = await Promise.all([JobModel.findById(jobId), JobProfileModel.findOne({ job: jobId }).select("+embedding")]);
  if (!job || !profile || profile.processingStatus !== "completed") return { status: "skipped" };
  const config = embeddingConfig();
  const content = jobEmbeddingText(job, profile);
  const contentHash = hashContent(content);
  if (profile.embeddingMetadata?.contentHash === contentHash && profile.embeddingMetadata?.embeddingVersion === config.version && profile.embeddingMetadata?.embeddingModel === config.model) {
    return { status: "unchanged" };
  }
  const startedAt = Date.now();
  try {
    const result = await aiService.generateEmbedding(content);
    if (!validVector(result.vector, config.dimensions)) throw new Error("Invalid embedding vector returned by provider");
    await vectorStore.upsert({
      sourceType: "job",
      sourceId: job._id,
      vector: result.vector,
      metadata: { sourceType: "job", sourceId: String(job._id), sourceVersion: profile.profileVersion, embeddingModel: result.model, embeddingVersion: config.version, dimensions: result.dimensions, contentHash, generatedAt: new Date() },
    });
    logger.info("embedding_completed", { sourceType: "job", sourceId: String(job._id), model: result.model, version: config.version, durationMs: Date.now() - startedAt });
    return { status: "completed" };
  } catch (error) {
    logger.warn("embedding_failed", { sourceType: "job", sourceId: String(job._id), model: config.model, version: config.version, errorName: error.name });
    return { status: "failed", reason: error.name };
  }
};

const triggerCandidateEmbedding = (userId) => embedCandidateProfile(userId).catch((error) => logger.error("embedding_unexpected_error", { sourceType: "candidate", sourceId: String(userId), message: error.message }));
const triggerJobEmbedding = (jobId) => embedJobProfile(jobId).catch((error) => logger.error("embedding_unexpected_error", { sourceType: "job", sourceId: String(jobId), message: error.message }));

export { embedCandidateProfile, embedJobProfile, triggerCandidateEmbedding, triggerJobEmbedding, vectorStore, hashContent };