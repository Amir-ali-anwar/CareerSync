"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { FileText, UploadCloud, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "@/components/common/form-field";
import { TagInput } from "@/components/common/tag-input";
import { useApplyForJob } from "@/hooks/use-jobs";
import { applyFormSchema, type ApplyFormValues } from "@/lib/validation/application";
import { CV_ACCEPTED_EXTENSIONS } from "@/constants";
import { ApiError } from "@/types/api";
import { cn } from "@/lib/utils";

export function ApplyJobDialog({ jobId, jobTitle }: { jobId: string; jobTitle: string }) {
  const [open, setOpen] = useState(false);
  const [skills, setSkills] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const applyForJob = useApplyForJob(jobId);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<ApplyFormValues>({
    resolver: zodResolver(applyFormSchema),
    defaultValues: { experienceLevel: "intermediate" },
  });

  const cvFile = watch("cv");

  function handleFile(file: File | undefined) {
    if (file) setValue("cv", file, { shouldValidate: true });
  }

  async function submit(values: ApplyFormValues) {
    const formData = new FormData();
    formData.append("cv", values.cv);
    if (values.coverLetter) formData.append("coverLetter", values.coverLetter);
    if (values.portfolio) formData.append("portfolio", values.portfolio);
    if (values.linkedInProfile) formData.append("linkedInProfile", values.linkedInProfile);
    formData.append("experienceLevel", values.experienceLevel);
    if (values.availability) formData.append("availability", values.availability);
    if (values.locationPreferences) formData.append("locationPreferences", values.locationPreferences);
    skills.forEach((skill) => formData.append("skills", skill));

    try {
      await applyForJob.mutateAsync(formData);
      toast.success(`Applied to ${jobTitle}. We'll analyze your resume in the background.`);
      setOpen(false);
      reset();
      setSkills([]);
    } catch (error) {
      if (error instanceof ApiError) toast.error(error.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="lg" />}>Apply now</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Apply to {jobTitle}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="max-h-[70vh] space-y-4 overflow-y-auto pr-1" noValidate>
          <FormField label="Resume / CV" error={errors.cv?.message as string | undefined} required>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                handleFile(e.dataTransfer.files?.[0]);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center transition-colors",
                dragActive ? "border-primary bg-primary/5" : "border-border"
              )}
            >
              {cvFile ? (
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="size-4 text-primary" />
                  <span className="max-w-56 truncate font-medium">{cvFile.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setValue("cv", undefined as unknown as File);
                    }}
                  >
                    <X className="size-3.5 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <>
                  <UploadCloud className="size-6 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Drag and drop, or <span className="font-medium text-primary">browse</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {CV_ACCEPTED_EXTENSIONS.join(", ")} · Max 5MB
                  </p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={CV_ACCEPTED_EXTENSIONS.join(",")}
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </FormField>

          <FormField label="Cover letter (optional)" htmlFor="coverLetter">
            <Textarea id="coverLetter" rows={3} {...register("coverLetter")} />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Portfolio URL (optional)" htmlFor="portfolio" error={errors.portfolio?.message}>
              <Input id="portfolio" placeholder="https://…" {...register("portfolio")} />
            </FormField>
            <FormField
              label="LinkedIn URL (optional)"
              htmlFor="linkedInProfile"
              error={errors.linkedInProfile?.message}
            >
              <Input id="linkedInProfile" placeholder="https://linkedin.com/in/…" {...register("linkedInProfile")} />
            </FormField>
          </div>

          <FormField label="Experience level" htmlFor="experienceLevel" required>
            <Select
              value={watch("experienceLevel")}
              onValueChange={(v) => setValue("experienceLevel", v as ApplyFormValues["experienceLevel"])}
            >
              <SelectTrigger id="experienceLevel" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="expert">Expert</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Your relevant skills (optional)" hint="Press Enter or comma to add">
            <TagInput value={skills} onChange={setSkills} placeholder="React, TypeScript…" />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Availability (optional)" htmlFor="availability">
              <Input id="availability" placeholder="Immediately" {...register("availability")} />
            </FormField>
            <FormField label="Location preferences (optional)" htmlFor="locationPreferences">
              <Input id="locationPreferences" placeholder="Remote" {...register("locationPreferences")} />
            </FormField>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={applyForJob.isPending}>
              {applyForJob.isPending ? "Submitting…" : "Submit application"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
