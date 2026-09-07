"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "@/components/common/form-field";
import { organizationFormSchema, type OrganizationFormValues } from "@/lib/validation/organization";
import { COMPANY_SIZES, ORGANIZATION_TYPES } from "@/constants";
import type { Organization, OrganizationFormPayload } from "@/types/organization";

interface OrganizationFormProps {
  initialOrganization?: Organization;
  onSubmit: (payload: OrganizationFormPayload) => Promise<void> | void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export function OrganizationForm({
  initialOrganization,
  onSubmit,
  isSubmitting,
  submitLabel = "Create organization",
}: OrganizationFormProps) {
  const [hqCity = "", hqCountry = ""] = (initialOrganization?.hqLocation || ", ").split(",").map((s) => s.trim());

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: {
      name: initialOrganization?.name || "",
      description: initialOrganization?.description || "",
      industry: initialOrganization?.industry || "",
      companySize: initialOrganization?.companySize || "1-10",
      city: hqCity,
      country: hqCountry,
      about: initialOrganization?.description || "",
      hiringContactEmail: initialOrganization?.hiringContactEmail || "",
      emailDomain: initialOrganization?.emailDomain || "",
      website: initialOrganization?.website || "",
      phone: initialOrganization?.phone || "",
      mission: initialOrganization?.mission || "",
      culture: initialOrganization?.culture || "",
      foundedYear: initialOrganization?.foundedYear ? String(initialOrganization.foundedYear) : "",
      organizationType: initialOrganization?.organizationType || "",
      careersPage: initialOrganization?.careersPage || "",
      linkedin: initialOrganization?.socialLinks?.linkedin || "",
      twitter: initialOrganization?.socialLinks?.twitter || "",
    },
  });

  const companySize = watch("companySize");
  const organizationType = watch("organizationType");

  async function submit(values: OrganizationFormValues) {
    const payload: OrganizationFormPayload = {
      name: values.name,
      description: values.description,
      industry: values.industry,
      companySize: values.companySize,
      headquarters: { city: values.city, country: values.country },
      about: values.about,
      hiringContactEmail: values.hiringContactEmail,
      emailDomain: values.emailDomain,
      website: values.website || undefined,
      phone: values.phone || undefined,
      mission: values.mission || undefined,
      culture: values.culture || undefined,
      foundedYear: values.foundedYear ? Number(values.foundedYear) : undefined,
      organizationType: (values.organizationType || undefined) as OrganizationFormPayload["organizationType"],
      careersPage: values.careersPage || undefined,
      socialLinks: {
        linkedin: values.linkedin || undefined,
        twitter: values.twitter || undefined,
      },
    };
    await onSubmit(payload);
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Organization name" htmlFor="name" error={errors.name?.message} required>
          <Input id="name" {...register("name")} />
        </FormField>
        <FormField label="Industry" htmlFor="industry" error={errors.industry?.message} required>
          <Input id="industry" placeholder="Technology" {...register("industry")} />
        </FormField>
      </div>

      <FormField label="Description" htmlFor="description" error={errors.description?.message} required>
        <Textarea id="description" rows={3} {...register("description")} />
      </FormField>

      <FormField label="About" htmlFor="about" error={errors.about?.message} required hint="Shown on your public profile">
        <Textarea id="about" rows={4} {...register("about")} />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Headquarters city" htmlFor="city" error={errors.city?.message} required>
          <Input id="city" {...register("city")} />
        </FormField>
        <FormField label="Headquarters country" htmlFor="country" error={errors.country?.message} required>
          <Input id="country" {...register("country")} />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Company size" htmlFor="companySize" required>
          <Select value={companySize} onValueChange={(v) => setValue("companySize", v as OrganizationFormValues["companySize"])}>
            <SelectTrigger id="companySize" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMPANY_SIZES.map((size) => (
                <SelectItem key={size} value={size}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Organization type (optional)" htmlFor="organizationType">
          <Select
            value={organizationType || ""}
            onValueChange={(v) => setValue("organizationType", v as OrganizationFormValues["organizationType"])}
          >
            <SelectTrigger id="organizationType" className="w-full">
              <SelectValue placeholder="Not specified" />
            </SelectTrigger>
            <SelectContent>
              {ORGANIZATION_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Hiring contact email" htmlFor="hiringContactEmail" error={errors.hiringContactEmail?.message} required>
          <Input id="hiringContactEmail" type="email" {...register("hiringContactEmail")} />
        </FormField>
        <FormField label="Email domain" htmlFor="emailDomain" error={errors.emailDomain?.message} required>
          <Input id="emailDomain" placeholder="company.com" {...register("emailDomain")} />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Website (optional)" htmlFor="website" error={errors.website?.message}>
          <Input id="website" placeholder="https://…" {...register("website")} />
        </FormField>
        <FormField label="Careers page (optional)" htmlFor="careersPage" error={errors.careersPage?.message}>
          <Input id="careersPage" placeholder="https://…" {...register("careersPage")} />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Phone (optional)" htmlFor="phone">
          <Input id="phone" {...register("phone")} />
        </FormField>
        <FormField label="Founded year (optional)" htmlFor="foundedYear">
          <Input id="foundedYear" type="number" {...register("foundedYear")} />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Mission (optional)" htmlFor="mission">
          <Textarea id="mission" rows={2} {...register("mission")} />
        </FormField>
        <FormField label="Culture (optional)" htmlFor="culture">
          <Textarea id="culture" rows={2} {...register("culture")} />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="LinkedIn (optional)" htmlFor="linkedin" error={errors.linkedin?.message}>
          <Input id="linkedin" placeholder="https://linkedin.com/company/…" {...register("linkedin")} />
        </FormField>
        <FormField label="Twitter / X (optional)" htmlFor="twitter" error={errors.twitter?.message}>
          <Input id="twitter" placeholder="https://x.com/…" {...register("twitter")} />
        </FormField>
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
