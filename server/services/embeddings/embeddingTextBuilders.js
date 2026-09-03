const joinValues = (values = []) => values.filter(Boolean).join(", ");

const candidateEmbeddingText = (profile) => {
  const education = (profile.education || [])
    .map((entry) => [entry.degree, entry.field].filter(Boolean).join(" in "))
    .filter(Boolean);

  return [
    `Candidate with ${profile.yearsOfExperience ?? "unspecified"} years of experience.`,
    `Skills: ${joinValues(profile.skills)}.`,
    `Domains: ${joinValues(profile.domains)}.`,
    `Preferred roles: ${joinValues(profile.preferredRoles)}.`,
    `Education: ${joinValues(education)}.`,
    `Certifications: ${joinValues(profile.certifications)}.`,
    profile.resumeText ? `Resume summary: ${profile.resumeText.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");
};

const jobEmbeddingText = (job, profile) =>
  [
    `Job title: ${profile.normalizedTitle || job.title || job.position || "unspecified"}.`,
    `Seniority: ${profile.seniority || "unspecified"}.`,
    `Required skills: ${joinValues(job.requiredSkills?.length ? job.requiredSkills : profile.requiredSkills)}.`,
    `Preferred skills: ${joinValues(job.preferredSkills?.length ? job.preferredSkills : profile.preferredSkills)}.`,
    `Experience required: ${job.requiredExperience ?? profile.yearsOfExperience ?? "unspecified"} years.`,
    `Domains: ${joinValues(profile.domains)}.`,
    `Responsibilities: ${joinValues(profile.responsibilities)}.`,
    `Work mode: ${job.workMode || "unspecified"}.`,
    `Location: ${[job.jobLocation?.city, job.jobLocation?.country].filter(Boolean).join(", ") || "unspecified"}.`,
    job.description ? `Description: ${job.description.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");

export { candidateEmbeddingText, jobEmbeddingText };