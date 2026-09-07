"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/common/form-field";
import { useResendVerification, useVerifyEmail } from "@/hooks/use-auth";
import { verifyEmailSchema, type VerifyEmailFormValues } from "@/lib/validation/auth";
import { ApiError } from "@/types/api";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const verifyEmail = useVerifyEmail();
  const resend = useResendVerification();
  const [verified, setVerified] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<VerifyEmailFormValues>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: { email: searchParams.get("email") || "" },
  });

  const email = watch("email");

  async function onSubmit(values: VerifyEmailFormValues) {
    try {
      await verifyEmail.mutateAsync(values);
      setVerified(true);
    } catch (error) {
      if (error instanceof ApiError) toast.error(error.message);
    }
  }

  async function handleResend() {
    if (!email) {
      toast.error("Enter your email first.");
      return;
    }
    try {
      await resend.mutateAsync({ email });
      toast.success("Verification code resent. Please check your inbox.");
    } catch (error) {
      if (error instanceof ApiError) toast.error(error.message);
    }
  }

  if (verified) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <CheckCircle2 className="size-10 text-success" />
        <h1 className="text-xl font-semibold">Email verified</h1>
        <p className="text-sm text-muted-foreground">Your account is ready. You can now sign in.</p>
        <Button render={<Link href="/login" />} className="w-full">
          Continue to sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Verify your email</h1>
        <p className="text-sm text-muted-foreground">
          Enter the 6-digit code we emailed you to finish creating your account.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField label="Email" htmlFor="email" error={errors.email?.message} required>
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
        </FormField>
        <FormField label="Verification code" htmlFor="otp" error={errors.otp?.message} required>
          <Input
            id="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            {...register("otp")}
          />
        </FormField>
        <Button type="submit" className="w-full" disabled={verifyEmail.isPending}>
          {verifyEmail.isPending ? "Verifying…" : "Verify email"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Didn&apos;t get a code?{" "}
        <button
          type="button"
          onClick={handleResend}
          disabled={resend.isPending}
          className="font-medium text-primary hover:underline disabled:opacity-50"
        >
          {resend.isPending ? "Sending…" : "Resend code"}
        </button>
      </p>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
