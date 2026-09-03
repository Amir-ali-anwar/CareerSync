import { OpenAI } from "openai";

// Real provider backed by the OpenAI API. Selected automatically when OPENAI_API_KEY is
// set (see ../index.js) - otherwise fakeProvider.js is used instead.
//
// IMPORTANT: this has NOT been exercised against a live API in this environment - no
// OPENAI_API_KEY is configured here to test against. The request shapes below follow
// the documented OpenAI Node SDK v5 API (embeddings.create, chat.completions.create
// with a JSON response_format), but this file needs a real smoke test against a real
// key before being trusted in production. Do not remove this notice until that's done.

const client = () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";

const openAiProvider = {
  name: "openai",

  async generateEmbedding(text) {
    const response = await client().embeddings.create({ model: EMBEDDING_MODEL, input: text });
    return {
      vector: response.data[0].embedding,
      model: EMBEDDING_MODEL,
      dimensions: response.data[0].embedding.length,
      usage: response.usage || null,
    };
  },

  // Structured-output extraction: the model is instructed to return ONLY the given JSON
  // shape, grounded ONLY in the supplied resume text - never invent skills/history not
  // present in it (the same "don't let the LLM assert unverified facts" rule that
  // governs explainMatch below).
  async extractResumeProfile(resumeText) {
    const response = await client().chat.completions.create({
      model: CHAT_MODEL,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Extract structured candidate data from the resume text the user provides. " +
            "Respond with ONLY a JSON object shaped exactly as: " +
            '{"skills": string[], "yearsOfExperience": number|null, ' +
            '"education": [{"degree": string, "field": string|null, "institution": string|null, "graduationYear": number|null}], ' +
            '"certifications": string[], "domains": string[]}. ' +
            '"domains" means industry/domain experience (e.g. "Fintech", "Healthcare"), only if ' +
            "clearly evidenced by employers/projects mentioned. Only include information explicitly " +
            "present in the text - never infer or invent skills, employers, or credentials that aren't stated.",
        },
        { role: "user", content: resumeText },
      ],
    });

    const parsed = JSON.parse(response.choices[0].message.content);
    return {
      skills: parsed.skills || [],
      yearsOfExperience: parsed.yearsOfExperience ?? null,
      education: parsed.education || [],
      certifications: parsed.certifications || [],
      domains: parsed.domains || [],
      usage: response.usage || null,
    };
  },

  // Same structured-extraction pattern as extractResumeProfile, applied to a job
  // posting's title + description instead of a resume.
  async extractJobProfile({ title = "", description = "" } = {}) {
    const response = await client().chat.completions.create({
      model: CHAT_MODEL,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Extract structured job-posting data from the title and description the user provides. " +
            "Respond with ONLY a JSON object shaped exactly as: " +
            '{"normalizedTitle": string|null, "seniority": "entry"|"mid"|"senior"|"lead"|null, ' +
            '"skills": string[], "requiredSkills": string[], "preferredSkills": string[], ' +
            '"yearsOfExperience": number|null, "education": string[], "certifications": string[], ' +
            '"domains": string[], "responsibilities": string[]}. ' +
            "Only include information explicitly present in or strongly implied by the text - never " +
            "invent skills, requirements, or domains that aren't actually stated.",
        },
        { role: "user", content: JSON.stringify({ title, description }) },
      ],
    });

    const parsed = JSON.parse(response.choices[0].message.content);
    return {
      normalizedTitle: parsed.normalizedTitle ?? null,
      seniority: parsed.seniority ?? null,
      skills: parsed.skills || [],
      requiredSkills: parsed.requiredSkills || [],
      preferredSkills: parsed.preferredSkills || [],
      yearsOfExperience: parsed.yearsOfExperience ?? null,
      education: parsed.education || [],
      certifications: parsed.certifications || [],
      domains: parsed.domains || [],
      responsibilities: parsed.responsibilities || [],
      usage: response.usage || null,
    };
  },

  // The LLM explains a score that was ALREADY computed deterministically elsewhere
  // (see services/matching) - it is given the evidence, not asked to invent or
  // re-derive the score itself, so the explanation can't silently become the real scorer.
  async explainMatch(evidence) {
    const response = await client().chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You explain a job-match result to a candidate in 2-3 sentences, warmly and " +
            "specifically. You are given the exact match evidence (score, matched skills, " +
            "missing skills, experience/work-mode fit) as JSON. Use ONLY that evidence - " +
            "never invent skills, requirements, or facts not present in it.",
        },
        { role: "user", content: JSON.stringify(evidence) },
      ],
    });
    return { explanation: response.choices[0].message.content.trim(), usage: response.usage || null };
  },

  async generateSkillGapSuggestions(missingSkills) {
    if (!missingSkills.length) {
      return { suggestions: "No skill gaps identified for this role.", usage: null };
    }
    const response = await client().chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        {
          role: "system",
          content:
            "Given a list of skills a candidate is missing for a role, write one short, " +
            "encouraging suggestion (1-2 sentences) for how they could close the gap. " +
            "Only reference the skills given - do not invent additional requirements.",
        },
        { role: "user", content: JSON.stringify(missingSkills) },
      ],
    });
    return { suggestions: response.choices[0].message.content.trim(), usage: response.usage || null };
  },
};

export default openAiProvider;
