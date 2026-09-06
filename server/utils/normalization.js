// Shared, deterministic text-normalization used on both the candidate and job sides
// (fakeProvider's skill extraction, JobProfile persistence, AIService.analyzeSkillGap),
// so there's exactly one alias table and one comparison rule for "do these two skill
// strings mean the same thing" - not several drifting copies. Deliberately small: a
// practical normalization layer, not a full skills ontology.

// [alias, canonical display form]. Every alias for the same skill maps to the same
// canonical form, so "ReactJS"/"React.js"/"React" all become "React".
const SKILL_ALIASES = [
  ["javascript", "JavaScript"], ["js", "JavaScript"],
  ["typescript", "TypeScript"], ["ts", "TypeScript"],
  ["react", "React"], ["reactjs", "React"], ["react.js", "React"],
  ["node.js", "Node.js"], ["nodejs", "Node.js"], ["node", "Node.js"],
  ["express", "Express"], ["express.js", "Express"], ["expressjs", "Express"],
  ["mongodb", "MongoDB"], ["mongo", "MongoDB"],
  ["postgresql", "PostgreSQL"], ["postgres", "PostgreSQL"],
  ["sql", "SQL"],
  ["python", "Python"], ["django", "Django"],
  ["java", "Java"], ["spring", "Spring"], ["springboot", "Spring"], ["spring boot", "Spring"],
  ["aws", "AWS"], ["docker", "Docker"],
  ["kubernetes", "Kubernetes"], ["k8s", "Kubernetes"],
  ["graphql", "GraphQL"],
  ["rest api", "REST API"], ["rest", "REST API"], ["restful api", "REST API"],
  ["next.js", "Next.js"], ["nextjs", "Next.js"],
  ["vue", "Vue"], ["vue.js", "Vue"], ["vuejs", "Vue"],
  ["angular", "Angular"], ["redis", "Redis"],
  ["ci/cd", "CI/CD"], ["cicd", "CI/CD"],
  ["git", "Git"], ["html", "HTML"], ["css", "CSS"],
  ["tailwind", "Tailwind"], ["tailwindcss", "Tailwind"],
  ["golang", "Go"], ["go", "Go"], ["rust", "Rust"],
];

const ALIAS_MAP = new Map(SKILL_ALIASES);
// Flat keyword list for scanning free text (extraction), longest-first so e.g.
// "rest api" is checked before the bare "rest" fragment it contains.
const KNOWN_SKILL_KEYWORDS = [...ALIAS_MAP.keys()].sort((a, b) => b.length - a.length);

const cleanToken = (raw) => String(raw).trim().toLowerCase().replace(/[^a-z0-9.+#/\s]/g, "");

// Canonical DISPLAY form (e.g. "Node.js") for showing a skill to a user - falls back to
// the original (trimmed) input when it isn't a known alias, rather than discarding it.
const canonicalSkillName = (rawSkill) => {
  const cleaned = cleanToken(rawSkill);
  return ALIAS_MAP.get(cleaned) || String(rawSkill).trim();
};

// Comparison KEY (lowercase of the canonical form) - use this, never raw strings, when
// checking whether two skills are "the same" (e.g. matching a candidate against a job).
const normalizeSkillKey = (rawSkill) => canonicalSkillName(rawSkill).toLowerCase();

// Dedupes a skill list by comparison key, keeping the first-seen canonical display form.
const normalizeSkillList = (skills = []) => {
  const seen = new Map();
  skills.forEach((skill) => {
    const key = normalizeSkillKey(skill);
    if (!seen.has(key)) seen.set(key, canonicalSkillName(skill));
  });
  return [...seen.values()];
};

const SENIORITY_TERMS = [
  { pattern: /\b(senior|sr\.?)\b/gi, level: "senior" },
  { pattern: /\b(lead|principal|staff)\b/gi, level: "lead" },
  { pattern: /\b(junior|jr\.?|entry[- ]level)\b/gi, level: "entry" },
  { pattern: /\b(mid[- ]level|intermediate)\b/gi, level: "mid" },
];

// "Senior Software Engineer" and "Sr Software Engineer" both normalize to the same
// base title ("software engineer") with seniority extracted separately as "senior".
// seniority is null (not a guessed default) when the title gives no signal at all.
const inferTitleAndSeniority = (title = "") => {
  let seniority = null;
  let normalizedTitle = title;
  for (const { pattern, level } of SENIORITY_TERMS) {
    if (pattern.test(title)) {
      seniority = level;
      normalizedTitle = normalizedTitle.replace(pattern, "");
    }
    pattern.lastIndex = 0;
  }
  normalizedTitle = normalizedTitle.replace(/\s+/g, " ").trim().toLowerCase();
  return { normalizedTitle: normalizedTitle || null, seniority };
};

// The ordered IC seniority ladder used everywhere seniority is COMPARED (e.g.
// services/matching/matchers/seniorityMatcher.js's adjacent-level distance scoring).
// Deliberately just 4 levels: "lead" absorbs staff/principal (see inferTitleAndSeniority
// above), and management tracks (manager/director) aren't modeled as a point on an IC
// ladder - comparing a management job's "seniority" against an IC candidate isn't the
// same kind of comparison, and forcing it onto this scale would be misleading rather
// than useful. Expand only if a real need for finer-grained levels shows up.
const SENIORITY_LEVELS = ["entry", "mid", "senior", "lead"];

// Deterministic, years-of-experience -> seniority mapping - used when a candidate has
// no explicit seniority signal of their own (CandidateProfile doesn't extract one from
// resume text; experience is the reliable quantitative signal that already exists).
// Thresholds are a documented heuristic, not an industry standard - adjust if evidence
// suggests otherwise. Returns null (not a guessed default) when years is null/undefined.
const EXPERIENCE_SENIORITY_THRESHOLDS = [
  { minYears: 9, level: "lead" },
  { minYears: 5, level: "senior" },
  { minYears: 2, level: "mid" },
  { minYears: 0, level: "entry" },
];

const inferSeniorityFromYearsOfExperience = (years) => {
  if (years === null || years === undefined || Number.isNaN(years)) return null;
  const match = EXPERIENCE_SENIORITY_THRESHOLDS.find((tier) => years >= tier.minYears);
  return match ? match.level : null;
};

export {
  KNOWN_SKILL_KEYWORDS,
  canonicalSkillName,
  normalizeSkillKey,
  normalizeSkillList,
  inferTitleAndSeniority,
  SENIORITY_LEVELS,
  inferSeniorityFromYearsOfExperience,
};
