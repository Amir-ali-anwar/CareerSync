import JobModel from "../../models/JobsModel.js";
import aiService from "../ai/index.js";
import { vectorStore } from "./embeddingService.js";

const activeJobFilter = (filters = {}) => {
  const filter = {
    isClosed: false,
    $or: [{ applicationDeadline: null }, { applicationDeadline: { $gt: new Date() } }],
  };
  if (filters.jobType && filters.jobType !== "all") filter.jobType = filters.jobType;
  if (filters.workMode && filters.workMode !== "all") filter.workMode = filters.workMode;
  if (filters.country) filter["jobLocation.country"] = new RegExp(filters.country, "i");
  return filter;
};

const semanticJobSearch = async (query, { page = 1, limit = 10, threshold = 0, ...filters } = {}) => {
  const jobs = await JobModel.find(activeJobFilter(filters)).select("_id").lean();
  if (!jobs.length) return { items: [], total: 0 };
  const embedding = await aiService.generateEmbedding(query);
  const results = await vectorStore.search({
    sourceType: "job",
    vector: embedding.vector,
    limit: jobs.length,
    filter: { job: { $in: jobs.map((job) => job._id) } },
  });
  const filtered = results.filter((result) => result.score >= threshold);
  const resultIds = filtered.map((result) => result.sourceId);
  const authoritativeJobs = await JobModel.find({ _id: { $in: resultIds } }).lean();
  const jobById = new Map(authoritativeJobs.map((job) => [String(job._id), job]));
  const ordered = filtered.map((result) => ({ job: jobById.get(String(result.sourceId)), semanticScore: result.score })).filter((item) => item.job);
  return { items: ordered.slice((page - 1) * limit, page * limit), total: ordered.length };
};

export { semanticJobSearch };