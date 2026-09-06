import CandidateProfileModel from "../../models/CandidateProfileModel.js";
import JobProfileModel from "../../models/JobProfileModel.js";

const modelForSourceType = (sourceType) => {
  if (sourceType === "candidate") return CandidateProfileModel;
  if (sourceType === "job") return JobProfileModel;
  throw new Error(`Unsupported embedding source type "${sourceType}"`);
};

const cosineSimilarity = (left, right) => {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length || !left.length) return null;
  const dotProduct = left.reduce((sum, value, index) => sum + value * right[index], 0);
  const leftMagnitude = Math.sqrt(left.reduce((sum, value) => sum + value * value, 0));
  const rightMagnitude = Math.sqrt(right.reduce((sum, value) => sum + value * value, 0));
  if (!leftMagnitude || !rightMagnitude) return null;
  return Math.max(0, Math.min(1, dotProduct / (leftMagnitude * rightMagnitude)));
};

class MongoVectorStore {
  async initialize() {
    return { status: "ready", backend: "mongodb-derived" };
  }

  async upsert({ sourceType, sourceId, vector, metadata }) {
    const Model = modelForSourceType(sourceType);
    const key = sourceType === "candidate" ? "user" : "job";
    await Model.findOneAndUpdate(
      { [key]: sourceId },
      { $set: { embedding: vector, embeddingMetadata: metadata } },
      { runValidators: true }
    );
  }

  async delete({ sourceType, sourceId }) {
    const Model = modelForSourceType(sourceType);
    const key = sourceType === "candidate" ? "user" : "job";
    await Model.findOneAndUpdate({ [key]: sourceId }, { $unset: { embedding: "", embeddingMetadata: "" } });
  }

  async search({ sourceType, vector, limit = 20, filter = {} }) {
    const Model = modelForSourceType(sourceType);
    const documents = await Model.find({ ...filter, embedding: { $exists: true, $ne: [] } })
      .select("+embedding embeddingMetadata user job")
      .lean();
    return documents
      .map((document) => ({ sourceId: document[sourceType === "candidate" ? "user" : "job"], score: cosineSimilarity(vector, document.embedding) }))
      .filter((result) => result.score !== null)
      .sort((left, right) => right.score - left.score || String(left.sourceId).localeCompare(String(right.sourceId)))
      .slice(0, limit);
  }
}

export { cosineSimilarity, MongoVectorStore };