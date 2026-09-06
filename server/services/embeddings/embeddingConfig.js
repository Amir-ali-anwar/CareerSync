const embeddingConfig = () => {
  const provider = process.env.EMBEDDING_PROVIDER || (process.env.OPENAI_API_KEY ? "openai" : "fake");
  return {
    provider,
    model: process.env.EMBEDDING_MODEL || (provider === "fake" ? "fake-hashing-embedding-v1" : process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small"),
    dimensions: Number(process.env.EMBEDDING_DIMENSIONS) || (provider === "fake" ? 32 : null),
    version: process.env.EMBEDDING_VERSION || "v1",
  };
};

export { embeddingConfig };