"use client";

import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/common/form-field";
import { TagInput } from "@/components/common/tag-input";
import { useCandidateProfile, useUpdateCandidateProfile } from "@/hooks/use-candidate-profile";
import { candidateProfileFormSchema, type CandidateProfileFormValues } from "@/lib/validation/candidateProfile";
import { WORK_MODES } from "@/constants";
import { ApiError } from "@/types/api";
import type { CandidateProfileUpdatePayload } from "@/types/candidateProfile";

export function ProfileForm() {
  const { data: profile } = useCandidateProfile();
  const updateProfile = useUpdateCandidateProfile();

  const [skills, setSkills] = useState<string[]>([]);
  const [certifications, setCertifications] = useState<string[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [preferredRoles, setPreferredRoles] = useState<string[]>([]);
  const [preferredLocations, setPreferredLocations] = useState<string[]>([]);

  const { register, control, handleSubmit, reset, watch, setValue } = useForm<CandidateProfileFormValues>({
    resolver: zodResolver(candidateProfileFormSchema),
    defaultValues: { yearsOfExperience: "", workModePreference: "any", education: [] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "education" });

  useEffect(() => {
    if (!profile) return;
    setSkills(profile.skills || []);
    setCertifications(profile.certifications || []);
    setDomains(profile.domains || []);
    setPreferredRoles(profile.preferredRoles || []);
    setPreferredLocations(profile.preferredLocations || []);
    reset({
      yearsOfExperience: profile.yearsOfExperience !== undefined ? String(profile.yearsOfExperience) : "",
      workModePreference: profile.workModePreference || "any",
      education: (profile.education || []).map((entry) => ({
        degree: entry.degree || "",
        field: entry.field || "",
        institution: entry.institution || "",
        graduationYear: entry.graduationYear ? String(entry.graduationYear) : "",
      })),
    });
  }, [profile, reset]);

  async function onSubmit(values: CandidateProfileFormValues) {
    const payload: CandidateProfileUpdatePayload = {
      skills,
      certifications,
      domains,
      preferredRoles,
      preferredLocations,
      workModePreference: values.workModePreference,
      yearsOfExperience: values.yearsOfExperience ? Number(values.yearsOfExperience) : undefined,
      education: values.education
        .filter((entry) => entry.degree || entry.field || entry.institution)
        .map((entry) => ({
          degree: entry.degree || undefined,
          field: entry.field || undefined,
          institution: entry.institution || undefined,
          graduationYear: entry.graduationYear ? Number(entry.graduationYear) : undefined,
        })),
    };

    try {
      await updateProfile.mutateAsync(payload);
      toast.success("Profile updated");
    } catch (error) {
      if (error instanceof ApiError) toast.error(error.message);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Skills & Experience</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField label="Skills" hint="Press Enter or comma to add">
            <TagInput value={skills} onChange={setSkills} placeholder="React, TypeScript…" />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Years of experience" htmlFor="yearsOfExperience">
              <Input id="yearsOfExperience" type="number" min={0} {...register("yearsOfExperience")} />
            </FormField>
            <FormField label="Work mode preference" htmlFor="workModePreference">
              <Select
                value={watch("workModePreference")}
                onValueChange={(v) => setValue("workModePreference", v as CandidateProfileFormValues["workModePreference"])}
              >
                <SelectTrigger id="workModePreference" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {WORK_MODES.map((mode) => (
                    <SelectItem key={mode.value} value={mode.value}>
                      {mode.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
          <FormField label="Certifications" hint="Press Enter or comma to add">
            <TagInput value={certifications} onChange={setCertifications} placeholder="AWS Certified Developer…" />
          </FormField>
          <FormField label="Domains / industries" hint="Press Enter or comma to add">
            <TagInput value={domains} onChange={setDomains} placeholder="Fintech, Healthcare…" />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField label="Preferred roles" hint="Press Enter or comma to add">
            <TagInput value={preferredRoles} onChange={setPreferredRoles} placeholder="Frontend Engineer…" />
          </FormField>
          <FormField label="Preferred locations" hint="Press Enter or comma to add">
            <TagInput value={preferredLocations} onChange={setPreferredLocations} placeholder="Remote, New York…" />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Education</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-4">
              <Input placeholder="Degree" {...register(`education.${index}.degree`)} />
              <Input placeholder="Field of study" {...register(`education.${index}.field`)} />
              <Input placeholder="Institution" {...register(`education.${index}.institution`)} />
              <div className="flex gap-2">
                <Input
                  placeholder="Graduation year"
                  type="number"
                  {...register(`education.${index}.graduationYear`)}
                />
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(index)} aria-label="Remove">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ degree: "", field: "", institution: "", graduationYear: "" })}
          >
            <Plus className="size-4" /> Add education
          </Button>
        </CardContent>
      </Card>

      <Button type="submit" disabled={updateProfile.isPending}>
        {updateProfile.isPending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
