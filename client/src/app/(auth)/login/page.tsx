"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/common/form-field";
import { useCompleteTwoFactorLogin, useLogin, useResendVerification } from "@/hooks/use-auth";
import { loginSchema, type LoginFormValues } from "@/lib/validation/auth";
import { ApiError } from "@/types/api";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useLogin();
  const completeTwoFactor = useCompleteTwoFactorLogin();
  const resend = useResendVerification();
  const [showPassword, setShowPassword] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [twoFactorTempToken, setTwoFactorTempToken] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginFormValues) {
    setUnverifiedEmail(null);
    try {
      const result = await login.mutateAsync(values);
      if ("requiresTwoFactor" in result) {
        setTwoFactorTempToken(result.tempToken);
        return;
      }
      toast.success("Welcome back");
      router.replace(searchParams.get("next") || "/dashboard");
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.message.toLowerCase().includes("verify")) {
          setUnverifiedEmail(values.email);
        }
        toast.error(error.message);
      }
    }
  }

  async function onSubmitTwoFactor(event: FormEvent) {
    event.preventDefault();
    if (!twoFactorTempToken) return;
    setTwoFactorError(null);
    try {
      await completeTwoFactor.mutateAsync({ tempToken: twoFactorTempToken, token: twoFactorCode.trim() });
      toast.success("Welcome back");
      router.replace(searchParams.get("next") || "/dashboard");
    } catch (error) {
      if (error instanceof ApiError) setTwoFactorError(error.message);
    }
  }

  if (twoFactorTempToken) {
    return (
      <div className="space-y-6">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Two-factor verification</h1>
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit code from your authenticator app, or a backup code.
          </p>
        </div>

        <form onSubmit={onSubmitTwoFactor} className="space-y-4" noValidate>
          <FormField label="Verification code" htmlFor="twoFactorCode" error={twoFactorError ?? undefined} required>
            <Input
              id="twoFactorCode"
              inputMode="text"
              autoComplete="one-time-code"
              placeholder="123456"
              autoFocus
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value)}
            />
          </FormField>

          <Button type="submit" className="w-full" disabled={completeTwoFactor.isPending || !twoFactorCode.trim()}>
            {completeTwoFactor.isPending ? "Verifying…" : "Verify"}
          </Button>

          <button
            type="button"
            onClick={() => {
              setTwoFactorTempToken(null);
              setTwoFactorCode("");
              setTwoFactorError(null);
            }}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
          >
            Back to sign in
          </button>
        </form>
      </div>
    );
  }

  async function handleResend() {
    const email = unverifiedEmail || getValues("email");
    if (!email) return;
    try {
      await resend.mutateAsync({ email });
      toast.success("Verification email sent. Please check your inbox.");
    } catch (error) {
      if (error instanceof ApiError) toast.error(error.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in to continue to your CareerSync workspace.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField label="Email" htmlFor="email" error={errors.email?.message} required>
          <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" {...register("email")} />
        </FormField>

        <FormField label="Password" htmlFor="password" error={errors.password?.message} required>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              className="pr-9"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </FormField>

        <div className="-mt-2 text-right">
          <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
            Forgot password?
          </Link>
        </div>

        {unverifiedEmail && (
          <div className="rounded-lg bg-warning/10 p-3 text-xs text-warning">
            Your email isn&apos;t verified yet.{" "}
            <button
              type="button"
              onClick={handleResend}
              disabled={resend.isPending}
              className="font-medium underline underline-offset-2"
            >
              Resend verification email
            </button>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={login.isPending}>
          {login.isPending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
