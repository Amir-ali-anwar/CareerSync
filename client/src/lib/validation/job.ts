import { z } from "zod";

function isBlankOrNonNegativeNumber(value: string | undefined) {
  if (value === undefined || value.trim() === "") return true;
  const parsed = Number(value);
  return !Number.isNaN(parsed) && parsed >= 0;
}

export const jobFormSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required"),
    company: z.string().trim().min(1, "Company is required"),
    position: z.string().trim().optional(),
    jobType: z.enum(["full-time", "part-time", "internship"]),
    country: z.string().trim().min(1, "Country is required"),
    city: z.string().trim().min(1, "City is required"),
    description: z.string().trim().min(1, "Description is required"),
    applicationDeadline: z.string().optional(),
    workMode: z.union([z.enum(["remote", "hybrid", "onsite"]), z.literal("")]).optional(),
    requiredExperience: z.string().optional(),
    salaryMin: z.string().optional(),
    salaryMax: z.string().optional(),
    currency: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (!isBlankOrNonNegativeNumber(data.requiredExperience)) {
      ctx.addIssue({ code: "custom", path: ["requiredExperience"], message: "Enter a valid number" });
    }
    if (!isBlankOrNonNegativeNumber(data.salaryMin)) {
      ctx.addIssue({ code: "custom", path: ["salaryMin"], message: "Enter a valid number" });
    }
    if (!isBlankOrNonNegativeNumber(data.salaryMax)) {
      ctx.addIssue({ code: "custom", path: ["salaryMax"], message: "Enter a valid number" });
    }
  });

export type JobFormValues = z.infer<typeof jobFormSchema>;
