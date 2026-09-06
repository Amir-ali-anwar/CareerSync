# Module F Final Report - Embeddings and Semantic Search

## Architecture

`AIService` remains the single provider boundary. Its existing fake and OpenAI providers
generate vectors; `EmbeddingService` builds deterministic profile text, hashes it, and
upserts derived vectors through `MongoVectorStore`. `semanticMatcher` reads those private
vectors during matching. Semantic search embeds a query, retrieves ranked job identifiers,
then loads canonical jobs from MongoDB before returning them.

## Vector Storage Decision

No Qdrant, PostgreSQL/pgvector, Atlas Vector Search configuration, or vector dependency
exists in this repository. Module F therefore uses private embedding fields on
`CandidateProfile` and `JobProfile`, with MongoDB as a derived vector-index store and
in-process cosine ranking. This is appropriate for the current small deployment and keeps
CI dependency-free. `MongoVectorStore` is an explicit boundary for a future Qdrant or
Atlas implementation when scale demands indexed vector retrieval.

## Provider and Versioning

Configuration is centralized in `services/embeddings/embeddingConfig.js`:
`EMBEDDING_PROVIDER`, `EMBEDDING_MODEL`, `EMBEDDING_DIMENSIONS`, and
`EMBEDDING_VERSION`. The default fake provider is deterministic, 32-dimensional, and
network-free. OpenAI uses the existing `text-embedding-3-small` configuration.

Each vector records source type/id/version, model, embedding version, dimensions,
content hash, and generation time. A matching content hash, model, and version skips a
regeneration. AIService retains bounded timeout/retry behavior; failures are logged and
never invalidate the profile or job.

## Lifecycles and Deletion

Resume and job intelligence now trigger embedding work asynchronously only after their
profiles are complete. Job deletion removes its `JobProfile`, including its derived vector.
Run `npm run backfill:embeddings` manually for existing completed profiles; startup never
performs a bulk backfill.

## Matching and Search

Algorithm `v1` remains deterministic with zero semantic weight. New default `v2` assigns
semantic similarity 10%, reduces required skills only to 35%, and preserves all other
deterministic dimensions. A severe required-skill gap remains bounded below 70 even with a
perfect semantic score. Semantic search is talent-only at
`GET /api/v1/jobs/search/semantic?q=...`; it enforces active/deadline visibility,
structured filters (`jobType`, `workMode`, `country`), threshold, pagination, and stable
score/id ordering. Raw vectors and candidate data are never returned.

## Limitations

Mongo in-process vector scanning is not a substitute for a dedicated indexed vector
database at large scale. The real OpenAI provider still needs a production credential
smoke test. The included fake embeddings provide deterministic lexical similarity for CI,
not production-quality semantic language understanding.

## Next Module

Module G - Explainable "Why You Match" can consume Module F evidence without changing
the retrieval or scoring foundation.