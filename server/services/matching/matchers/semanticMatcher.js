import { cosineSimilarity } from "../../embeddings/mongoVectorStore.js";

const semanticMatcher = (candidateProfile, jobProfile) => {
	const similarity = cosineSimilarity(candidateProfile?.embedding, jobProfile?.embedding);
	if (similarity === null) return { score: null, note: "Embedding data is not available." };
	return { score: similarity, similarity };
};

export default semanticMatcher;
