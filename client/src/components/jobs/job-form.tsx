"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "@/components/common/form-field";
import { TagInput } from "@/components/common/tag-input";
import { jobFormSchema, type JobFormValues } from "@/lib/validation/job";
import { JOB_TYPES, WORK_MODES } from "@/constants";
import type { CreateJobPayload, Job } from "@/types/job";

interface JobFormProps {
  initialJob?: Job;
  onSubmit: (payload: CreateJobPayload) => Promise<void> | void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export function JobForm({ initialJob, onSubmit, isSubmitting, submitLabel = "Post job" }: JobFormProps) {
  const [requiredSkills, setRequiredSkills] = useState<string[]>(initialJob?.requiredSkills || []);
  const [preferredSkills, setPreferredSkills] = useState<string[]>(initialJob?.preferredSkills || []);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<JobFormValues>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: {
      title: initialJob?.title || "",
      company: initialJob?.company || "",
      position: initialJob?.position || "",
      jobType: initialJob?.jobType || "full-time",
      country: initialJob?.jobLocation.country || "",
      city: initialJob?.jobLocation.city || "",
      description: initialJob?.description || "",
      applicationDeadline: initialJob?.applicationDeadline
        ? initialJob.applicationDeadline.slice(0, 10)
        : "",
      workMode: initialJob?.workMode || "",
      requiredExperience:
        initialJob?.requiredExperience !== undefined ? String(initialJob.requiredExperience) : "",
      salaryMin: initialJob?.salaryRange?.min !== undefined ? String(initialJob.salaryRange.min) : "",
      salaryMax: initialJob?.salaryRange?.max !== undefined ? String(initialJob.salaryRange.max) : "",
      currency: initialJob?.salaryRange?.currency || "USD",
    },
  });

  const jobType = watch("jobType");
  const workMode = watch("workMode");

  function toNumber(value: string | undefined): number | undefined {
    if (!value || value.trim() === "") return undefined;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  async function submit(values: JobFormValues) {
    const salaryMin = toNumber(values.salaryMin);
    const salaryMax = toNumber(values.salaryMax);
    const payload: CreateJobPayload = {
      title: values.title,
      company: values.company,
      position: values.position || undefined,
      jobType: values.jobType,
      jobLocation: { country: values.country, city: values.city },
      description: values.description,
      applicationDeadline: values.applicationDeadline
        ? new Date(values.applicationDeadline).toISOString()
        : undefined,
      requiredSkills,
      preferredSkills,
      requiredExperience: toNumber(values.requiredExperience),
      workMode: (values.workMode || undefined) as CreateJobPayload["workMode"],
      salaryRange:
        salaryMin !== undefined || salaryMax !== undefined
          ? { min: salaryMin, max: salaryMax, currency: values.currency || "USD" }
          : undefined,
    };
    await onSubmit(payload);
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Job title" htmlFor="title" error={errors.title?.message} required>
          <Input id="title" placeholder="Senior Software Engineer" {...register("title")} />
        </FormField>
        <FormField label="Company" htmlFor="company" error={errors.company?.message} required>
          <Input id="company" placeholder="Tech Corp" {...register("company")} />
        </FormField>
      </div>

      <FormField label="Position (optional)" htmlFor="position" error={errors.position?.message}>
        <Input id="position" placeholder="Software Engineer" {...register("position")} />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Job type" htmlFor="jobType" required>
          <Select value={jobType} onValueChange={(v) => setValue("jobType", v as JobFormValues["jobType"])}>
            <SelectTrigger id="jobType" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {JOB_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Work mode (optional)" htmlFor="workMode">
          <Select value={workMode || ""} onValueChange={(v) => setValue("workMode", v as JobFormValues["workMode"])}>
            <SelectTrigger id="workMode" className="w-full">
              <SelectValue placeholder="Not specified" />
            </SelectTrigger>
            <SelectContent>
              {WORK_MODES.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Required experience (years, optional)" htmlFor="requiredExperience">
          <Input id="requiredExperience" type="number" min={0} {...register("requiredExperience")} />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Country" htmlFor="country" error={errors.country?.message} required>
          <Input id="country" {...register("country")} />
        </FormField>
        <FormField label="City" htmlFor="city" error={errors.city?.message} required>
          <Input id="city" {...register("city")} />
        </FormField>
      </div>

      <FormField label="Description" htmlFor="description" error={errors.description?.message} required>
        <Textarea id="description" rows={6} placeholder="Describe the role, responsibilities, and requirements…" {...register("description")} />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Required skills (optional)" hint="Press Enter or comma to add">
          <TagInput value={requiredSkills} onChange={setRequiredSkills} placeholder="React, Node.js…" />
        </FormField>
        <FormField label="Preferred skills (optional)" hint="Press Enter or comma to add">
          <TagInput value={preferredSkills} onChange={setPreferredSkills} placeholder="Docker, GraphQL…" />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Salary min (optional)" htmlFor="salaryMin">
          <Input id="salaryMin" type="number" min={0} {...register("salaryMin")} />
        </FormField>
        <FormField label="Salary max (optional)" htmlFor="salaryMax">
          <Input id="salaryMax" type="number" min={0} {...register("salaryMax")} />
        </FormField>
        <FormField label="Currency" htmlFor="currency">
          <Input id="currency" placeholder="USD" {...register("currency")} />
        </FormField>
      </div>

      <FormField label="Application deadline (optional)" htmlFor="applicationDeadline">
        <Input id="applicationDeadline" type="date" {...register("applicationDeadline")} />
      </FormField>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
