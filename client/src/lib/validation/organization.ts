import { z } from "zod";
import { COMPANY_SIZES, ORGANIZATION_TYPES } from "@/constants";

const optionalUrl = z.union([z.string().url("Enter a valid URL"), z.literal("")]).optional();

export const organizationFormSchema = z.object({
  name: z.string().trim().min(1, "Organization name is required"),
  description: z.string().trim().min(1, "Description is required"),
  industry: z.string().trim().min(1, "Industry is required"),
  companySize: z.enum(COMPANY_SIZES),
  city: z.string().trim().min(1, "City is required"),
  country: z.string().trim().min(1, "Country is required"),
  about: z.string().trim().min(1, "About section is required"),
  hiringContactEmail: z.string().min(1, "Hiring contact email is required").email("Enter a valid email"),
  emailDomain: z.string().trim().min(1, "Email domain is required"),
  website: optionalUrl,
  phone: z.string().trim().optional(),
  mission: z.string().trim().optional(),
  culture: z.string().trim().optional(),
  foundedYear: z.string().optional(),
  organizationType: z.union([z.enum(ORGANIZATION_TYPES), z.literal("")]).optional(),
  careersPage: optionalUrl,
  linkedin: optionalUrl,
  twitter: optionalUrl,
});

export type OrganizationFormValues = z.infer<typeof organizationFormSchema>;
