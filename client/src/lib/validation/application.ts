import { z } from "zod";
import { CV_ACCEPTED_EXTENSIONS, CV_ACCEPTED_MIME_TYPES, CV_MAX_SIZE_BYTES } from "@/constants";

export const applyFormSchema = z.object({
  cv: z
    .instanceof(File, { message: "Please attach your CV" })
    .refine((file) => file.size <= CV_MAX_SIZE_BYTES, "CV file must be smaller than 5MB")
    .refine(
      (file) => CV_ACCEPTED_MIME_TYPES.includes(file.type),
      `Only ${CV_ACCEPTED_EXTENSIONS.join(", ")} files are allowed`
    ),
  coverLetter: z.string().trim().optional(),
  portfolio: z.union([z.string().url("Enter a valid URL"), z.literal("")]).optional(),
  linkedInProfile: z.union([z.string().url("Enter a valid URL"), z.literal("")]).optional(),
  experienceLevel: z.enum(["beginner", "intermediate", "expert"]),
  availability: z.string().trim().optional(),
  locationPreferences: z.string().trim().optional(),
});

export type ApplyFormValues = z.infer<typeof applyFormSchema>;
