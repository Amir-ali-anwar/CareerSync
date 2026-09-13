import JobApplicationModel from "../../models/JobApplicationModel.js";
import CandidateProfileModel from "../../models/CandidateProfileModel.js";
import JobProfileModel from "../../models/JobProfileModel.js";
import { calculateMatch, calculateMatchesForCandidate } from "../matching/matchingService.js";
import { classifyMatchLevel } from "../matching/matchLevel.js";
import { normalizeSkillKey } from "../../utils/normalization.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const FOLLOW_UP_AFTER_DAYS = 7;

const daysSince = (value, now = new Date()) => Math.max(0, Math.floor((now.getTime() - new Date(value).getTime()) / DAY_MS));

const classifyApplicationHealth = ({ application, match, now = new Date() }) => {
  const ageDays = daysSince(application.appliedAt || application.createdAt, now);
  const matchScore = match?.matchScore ?? null;

  if (application.status === "interview") {
    return { priority: "high", reason: "This application is in the interview stage.", recommendedAction: "Prepare for the interview." };
  }
  if (application.status === "shortlisted") {
    return { priority: "high", reason: "This application has been shortlisted.", recommendedAction: "Review the role and prepare for the next step." };
  }
  if ((application.status === "pending" || application.status === "under review") && ageDays >= FOLLOW_UP_AFTER_DAYS) {
    const strength = matchScore === null ? "The application has had no recent status change." : `It is a ${matchScore}% match with no recent status change.`;
    return { priority: matchScore !== null && matchScore >= 75 ? "high" : "medium", reason: `${strength} It has been ${ageDays} days since submission.`, recommendedAction: "Consider following up with the recruiter." };
  }
  if (application.status === "rejected" || application.status === "withdrawn") {
    return { priority: "low", reason: `This application is ${application.status}.`, recommendedAction: "No action is currently required." };
  }
  return { priority: "low", reason: "This application is recent and has no recorded action needed.", recommendedAction: "Monitor the application for a status update." };
};

const profileReadiness = (profile) => {
  const checks = {
    skills: Boolean(profile?.skills?.length),
    experience: profile?.yearsOfExperience !== undefined && profile?.yearsOfExperience !== null,
    education: Boolean(profile?.education?.length),
    preferences: Boolean(profile?.preferredRoles?.length || profile?.preferredLocations?.length),
    resume: profile?.processingStatus === "completed",
  };
  const completed = Object.values(checks).filter(Boolean).length;
  return { score: Math.round((completed / Object.keys(checks).length) * 100), breakdown: checks };
};

const buildApplicationContext = async (userId, now = new Date()) => {
  const [profile, applications] = await Promise.all([
    CandidateProfileModel.findOne({ user: userId }),
    JobApplicationModel.find({ talent: userId }).sort({ updatedAt: -1 }).limit(100).populate("job"),
  ]);
  const jobs = applications.map((application) => application.job).filter(Boolean);
  const jobIds = jobs.map((job) => job._id);
  const jobProfiles = await JobProfileModel.find({ job: { $in: jobIds } });
  const profileByJobId = new Map(jobProfiles.map((jobProfile) => [String(jobProfile.job), jobProfile]));
  const enrichedApplications = applications.map((application) => {
    const job = application.job;
    const jobProfile = job ? profileByJobId.get(String(job._id)) : null;
    const match = job ? calculateMatch(profile, job, jobProfile) : null;
    return {
      application,
      job,
      match,
      health: classifyApplicationHealth({ application, match, now }),
    };
  });
  return { profile, applications: enrichedApplications };
};

const buildSkillGapFrequency = (enrichedApplications) => {
  const totals = new Map();
  for (const { job, match } of enrichedApplications) {
    if (!job || !match) continue;
    const requiredSkills = job.requiredSkills || [];
    for (const skill of requiredSkills) {
      const key = normalizeSkillKey(skill);
      const current = totals.get(key) || { skill, jobs: 0, missing: 0 };
      current.jobs += 1;
      if (match.missingRequiredSkills.some((missing) => normalizeSkillKey(missing) === key)) current.missing += 1;
      totals.set(key, current);
    }
  }
  return [...totals.values()]
    .filter((item) => item.missing > 0)
    .map((item) => ({ ...item, frequency: Math.round((item.missing / item.jobs) * 100) }))
    .sort((left, right) => right.missing - left.missing || right.frequency - left.frequency)
    .slice(0, 5);
};

const buildCareerInsights = async (userId, now = new Date(), existingContext) => {
  const context = existingContext || await buildApplicationContext(userId, now);
  const health = context.applications.map(({ application, job, match, health: applicationHealth }) => ({
    applicationId: application._id,
    jobId: job?._id,
    company: job?.company,
    role: job?.title || application.Jobtitle,
    status: application.status,
    appliedAt: application.appliedAt,
    matchScore: match?.matchScore ?? null,
    classification: match ? classifyMatchLevel(match.matchScore) : null,
    ...applicationHealth,
  }));
  const attention = health.filter((item) => item.priority === "high" || item.priority === "medium");
  const skillGaps = buildSkillGapFrequency(context.applications);
  const readiness = profileReadiness(context.profile);
  const averageMatchScore = health.filter((item) => item.matchScore !== null).length
    ? Math.round(health.filter((item) => item.matchScore !== null).reduce((sum, item) => sum + item.matchScore, 0) / health.filter((item) => item.matchScore !== null).length)
    : null;

  return {
    readiness,
    applications: {
      total: health.length,
      active: health.filter((item) => item.status !== "withdrawn" && item.status !== "rejected").length,
      needingAttention: attention,
      averageMatchScore,
    },
    skillGaps,
    recommendations: [
      ...attention.slice(0, 3).map((item) => ({ type: "application", text: item.recommendedAction, applicationId: item.applicationId, jobId: item.jobId })),
      ...skillGaps.slice(0, 3).map((item) => ({ type: "skill_gap", text: `${item.skill} is missing from ${item.frequency}% of the matched applications evaluated.`, jobId: null })),
    ],
  };
};

const detectIntent = (message) => {
  const text = message.toLowerCase();
  if (/follow.?up|attention|inactive|need action/.test(text)) return "FOLLOW_UP";
  if (/skill|learn|gap|improve/.test(text)) return "SKILL_GAP";
  if (/apply|best job|which jobs|recommend/.test(text)) return "JOB_RECOMMENDATION";
  if (/application|status|applied/.test(text)) return "APPLICATION_STATUS";
  if (/profile|ready|readiness|resume/.test(text)) return "PROFILE";
  return "CAREER_INSIGHT";
};

const answerCopilotQuery = async (userId, message, now = new Date()) => {
  const context = await buildApplicationContext(userId, now);
  const insights = await buildCareerInsights(userId, now, context);
  const intent = detectIntent(message);
  const references = [];
  let answer;

  if (intent === "FOLLOW_UP") {
    const items = insights.applications.needingAttention;
    answer = items.length ? `I found ${items.length} application${items.length === 1 ? "" : "s"} needing attention. ${items[0].recommendedAction}` : "I do not see any applications that currently need follow-up based on their status and age.";
    items.slice(0, 5).forEach((item) => references.push({ type: "application", applicationId: item.applicationId, jobId: item.jobId }));
  } else if (intent === "SKILL_GAP") {
    answer = insights.skillGaps.length ? `The most frequent missing required skill in the applications evaluated is ${insights.skillGaps[0].skill}. It is missing from ${insights.skillGaps[0].frequency}% of those jobs.` : "I do not have enough application and job-profile data to identify a recurring skill gap yet.";
    insights.skillGaps.slice(0, 5).forEach((item) => references.push({ type: "skill", skill: item.skill }));
  } else if (intent === "JOB_RECOMMENDATION") {
    const recommendations = await calculateMatchesForCandidate(userId, { page: 1, limit: 3, minScore: 0 });
    const ranked = recommendations.items || [];
    answer = ranked.length ? `Your strongest open job recommendation is ${ranked[0].job?.title || "this role"} at ${ranked[0].job?.company || "the listed company"}, with a ${ranked[0].matchScore}% match.` : "I do not have enough match data to recommend an open job yet. Complete your profile or upload a resume first.";
    ranked.forEach(({ job, matchScore }) => references.push({ type: "job", jobId: job?._id, matchScore }));
  } else if (intent === "APPLICATION_STATUS") {
    answer = `You have ${insights.applications.total} recorded application${insights.applications.total === 1 ? "" : "s"}, including ${insights.applications.active} active application${insights.applications.active === 1 ? "" : "s"}.`;
    context.applications.slice(0, 5).forEach(({ application, job }) => references.push({ type: "application", applicationId: application._id, jobId: job?._id }));
  } else if (intent === "PROFILE") {
    answer = `Your current career readiness estimate is ${insights.readiness.score}%, based on recorded skills, experience, education, preferences, and completed resume processing. This is a profile-completeness indicator, not an outcome prediction.`;
    references.push({ type: "candidate_profile" });
  } else {
    answer = `I can help with applications, follow-ups, skill gaps, job priorities, and profile readiness using your CareerSync data. Ask about one of those areas to get a grounded answer.`;
  }

  return { intent, answer, insights: insights.recommendations.slice(0, 5), references };
};

export { buildCareerInsights, classifyApplicationHealth, buildSkillGapFrequency, detectIntent, answerCopilotQuery };
