import JobModal from "../models/JobsModel.js";
import JobApplicationModal from "../models/JobApplicationModel.js";
import OrganizationModal from "../models/OrganizationModel.js";

describe("MongoDB index declarations (schema level)", () => {
  it("declares Job.createdBy and the isClosed+applicationDeadline compound index", () => {
    const fields = JobModal.schema.indexes().map(([f]) => f);
    expect(fields).toContainEqual({ createdBy: 1 });
    expect(fields).toContainEqual({ isClosed: 1, applicationDeadline: 1 });
  });

  it("declares Organization.createdBy", () => {
    const fields = OrganizationModal.schema.indexes().map(([f]) => f);
    expect(fields).toContainEqual({ createdBy: 1 });
  });

  it("declares JobApplication.talent and the unique job+talent index", () => {
    const indexes = JobApplicationModal.schema.indexes();
    const fields = indexes.map(([f]) => f);
    expect(fields).toContainEqual({ talent: 1 });

    const jobTalentIndex = indexes.find(([f]) => f.job === 1 && f.talent === 1);
    expect(jobTalentIndex).toBeDefined();
    expect(jobTalentIndex[1].unique).toBe(true);
  });
});

describe("MongoDB index registration (built on the actual collection)", () => {
  const waitForIndexes = (Model) => Model.init();

  it("builds the declared indexes on the Job collection", async () => {
    await waitForIndexes(JobModal);
    const indexes = await JobModal.collection.getIndexes();
    const indexNames = Object.keys(indexes);
    expect(indexNames).toContain("createdBy_1");
    expect(indexNames).toContain("isClosed_1_applicationDeadline_1");
  });

  it("builds the declared indexes on the Organization collection", async () => {
    await waitForIndexes(OrganizationModal);
    const indexes = await OrganizationModal.collection.getIndexes();
    expect(Object.keys(indexes)).toContain("createdBy_1");
  });

  it("builds the declared indexes on the JobApplication collection", async () => {
    await waitForIndexes(JobApplicationModal);
    const indexes = await JobApplicationModal.collection.getIndexes();
    const indexNames = Object.keys(indexes);
    expect(indexNames).toContain("talent_1");
    expect(indexNames).toContain("job_1_talent_1");
  });
});
