import { z } from "zod";

export const educationEntrySchema = z.object({
  degree: z.string().trim().optional(),
  field: z.string().trim().optional(),
  institution: z.string().trim().optional(),
  graduationYear: z.string().optional(),
});

export const candidateProfileFormSchema = z.object({
  yearsOfExperience: z.string().optional(),
  workModePreference: z.enum(["remote", "hybrid", "onsite", "any"]),
  education: z.array(educationEntrySchema),
});

export type CandidateProfileFormValues = z.infer<typeof candidateProfileFormSchema>;
