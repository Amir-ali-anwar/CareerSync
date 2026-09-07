"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { FileText, UploadCloud } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProcessingStatusBadge } from "@/components/common/status-badge";
import { useCandidateProfile, useUploadResume } from "@/hooks/use-candidate-profile";
import { CV_ACCEPTED_EXTENSIONS } from "@/constants";
import { ApiError } from "@/types/api";
import { cn, formatRelativeDate } from "@/lib/utils";

export function ResumeUploadCard() {
  const { data: profile } = useCandidateProfile();
  const uploadResume = useUploadResume();
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    const formData = new FormData();
    formData.append("cv", file);
    try {
      await uploadResume.mutateAsync(formData);
      toast.success("Resume uploaded. AI is analyzing it in the background.");
    } catch (error) {
      if (error instanceof ApiError) toast.error(error.message);
    }
  }

  const displayName = profile?.resumeMetadata?.originalFileName || profile?.resumeMetadata?.fileName;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Resume
          {profile?.processingStatus && <ProcessingStatusBadge status={profile.processingStatus} />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
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
          {displayName ? (
            <div className="flex items-center gap-2 text-sm">
              <FileText className="size-4 text-primary" />
              <span className="max-w-64 truncate font-medium">{displayName}</span>
            </div>
          ) : (
            <>
              <UploadCloud className="size-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Drag and drop, or <span className="font-medium text-primary">browse</span>
              </p>
            </>
          )}
          <p className="text-xs text-muted-foreground">{CV_ACCEPTED_EXTENSIONS.join(", ")} · Max 5MB</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={CV_ACCEPTED_EXTENSIONS.join(",")}
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        {profile?.resumeMetadata?.extractedAt && (
          <p className="text-xs text-muted-foreground">
            Last analyzed {formatRelativeDate(profile.resumeMetadata.extractedAt)}
          </p>
        )}
        {profile?.processingStatus === "failed" && profile.processingError && (
          <p className="text-xs text-error">Analysis failed: {profile.processingError}</p>
        )}
      </CardContent>
    </Card>
  );
}
