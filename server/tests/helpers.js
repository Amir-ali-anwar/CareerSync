import request from "supertest";
import app from "../app.js";
import User from "../models/User.js";

const basePassword = "password123";

export const validLocation = { country: "United States", city: "New York" };

export const talentPayload = (overrides = {}) => ({
  name: "Talent",
  lastName: "User",
  email: `talent-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
  password: basePassword,
  location: validLocation,
  role: "talent",
  phone: "+14155552671",
  ...overrides,
});

export const employerPayload = (overrides = {}) => ({
  name: "Employer",
  lastName: "User",
  email: `employer-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
  password: basePassword,
  location: validLocation,
  role: "employer",
  phone: "+14155552672",
  companyName: "Tech Corp",
  companySize: "51-200",
  industry: "Technology",
  ...overrides,
});

export const registerUser = async (payload) => {
  const res = await request(app).post("/api/v1/auth/register").send(payload);
  return res;
};

export const verifyUser = async (email) => {
  const user = await User.findOne({ email });
  await request(app)
    .get("/api/v1/auth/verify-Email")
    .query({ email, verificationToken: user.verificationToken });
  return User.findOne({ email });
};

/**
 * Registers, verifies, and logs a user in. Returns a supertest agent that
 * persists cookies across requests, plus the created user document.
 */
export const registerVerifiedAgent = async (payload) => {
  await registerUser(payload);
  await verifyUser(payload.email);

  const agent = request.agent(app);
  await agent.post("/api/v1/auth/login").send({
    email: payload.email,
    password: payload.password,
  });

  const user = await User.findOne({ email: payload.email });
  return { agent, user };
};

export const createTalentAgent = async (overrides = {}) =>
  registerVerifiedAgent(talentPayload(overrides));

export const createEmployerAgent = async (overrides = {}) =>
  registerVerifiedAgent(employerPayload(overrides));

export const validJobPayload = (overrides = {}) => ({
  title: "Senior Software Engineer",
  company: "Tech Corp",
  position: "Software Engineer",
  jobType: "full-time",
  jobLocation: { country: "United States", city: "San Francisco" },
  description: "We are looking for a senior software engineer.",
  ...overrides,
});

export const createJob = async (employerAgent, overrides = {}) => {
  const res = await employerAgent
    .post("/api/v1/jobs")
    .send(validJobPayload(overrides));
  return res.body.job;
};

export const validOrganizationPayload = (overrides = {}) => ({
  name: "Tech Innovations Inc",
  description: "Leading technology company focused on innovation",
  industry: "Technology",
  companySize: "51-200",
  headquarters: { city: "San Francisco", country: "United States" },
  about: "We are a leading technology company.",
  hiringContactEmail: "hiring@techinnovations.com",
  emailDomain: "techinnovations.com",
  ...overrides,
});

export const createOrganization = async (employerAgent, overrides = {}) => {
  const res = await employerAgent
    .post("/api/v1/organization")
    .send(validOrganizationPayload(overrides));
  return res.body.newOrganization;
};

export { app };
