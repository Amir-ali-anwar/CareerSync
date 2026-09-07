"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Briefcase, Eye, EyeOff, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/common/form-field";
import { CountrySelect } from "@/components/common/country-select";
import { CitySelect } from "@/components/common/city-select";
import { PhoneInput } from "@/components/common/phone-input";
import { cn } from "@/lib/utils";
import { useRegister } from "@/hooks/use-auth";
import { registerSchema, type RegisterFormValues } from "@/lib/validation/auth";
import { ApiError } from "@/types/api";
import { COMPANY_SIZES } from "@/constants";

export default function RegisterPage() {
  const router = useRouter();
  const registerUser = useRegister();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: "talent" },
  });

  const role = watch("role");
  const country = watch("country");

  async function onSubmit(values: RegisterFormValues) {
    try {
      await registerUser.mutateAsync({
        name: values.name,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
        phone: values.phone,
        role: values.role,
        location: { country: values.country, city: values.city },
        ...(values.role === "employer" && {
          companyName: values.companyName,
          companySize: values.companySize,
          industry: values.industry,
        }),
      });
      toast.success("Account created! Check your email to verify your address.");
      router.push(`/login?verify=1`);
    } catch (error) {
      if (error instanceof ApiError) toast.error(error.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Create your account</h1>
        <p className="text-sm text-muted-foreground">Join CareerSync as a candidate or an employer.</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setValue("role", "talent")}
          className={cn(
            "flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-sm font-medium transition-colors",
            role === "talent" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
          )}
        >
          <User className="size-4" /> I&apos;m looking for a job
        </button>
        <button
          type="button"
          onClick={() => setValue("role", "employer")}
          className={cn(
            "flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-sm font-medium transition-colors",
            role === "employer" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
          )}
        >
          <Briefcase className="size-4" /> I&apos;m hiring
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="First name" htmlFor="name" error={errors.name?.message} required>
            <Input id="name" autoComplete="given-name" {...register("name")} />
          </FormField>
          <FormField label="Last name" htmlFor="lastName" error={errors.lastName?.message} required>
            <Input id="lastName" autoComplete="family-name" {...register("lastName")} />
          </FormField>
        </div>

        <FormField label="Email" htmlFor="email" error={errors.email?.message} required>
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Country" htmlFor="country" error={errors.country?.message} required>
            <CountrySelect
              id="country"
              value={country}
              aria-invalid={!!errors.country}
              onChange={(next) => {
                setValue("country", next?.value ?? "", { shouldValidate: true });
                setValue("city", "", { shouldValidate: true });
              }}
            />
          </FormField>
          <FormField label="City" htmlFor="city" error={errors.city?.message} required>
            <CitySelect
              id="city"
              value={watch("city") ?? ""}
              countryIsoCode={country}
              aria-invalid={!!errors.city}
              onChange={(next) => setValue("city", next, { shouldValidate: true })}
            />
          </FormField>
        </div>

        <FormField label="Phone" htmlFor="phone" error={errors.phone?.message} required>
          <PhoneInput
            id="phone"
            value={watch("phone") ?? ""}
            countryIsoCode={country}
            aria-invalid={!!errors.phone}
            onChange={(next) => setValue("phone", next, { shouldValidate: true })}
          />
        </FormField>

        {role === "employer" && (
          <div className="space-y-4 rounded-lg border border-border bg-secondary/40 p-3">
            <FormField label="Company name" htmlFor="companyName" error={errors.companyName?.message} required>
              <Input id="companyName" {...register("companyName")} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Company size" htmlFor="companySize" error={errors.companySize?.message} required>
                <select
                  id="companySize"
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  {...register("companySize")}
                >
                  <option value="">Select…</option>
                  {COMPANY_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Industry" htmlFor="industry" error={errors.industry?.message} required>
                <Input id="industry" placeholder="Technology" {...register("industry")} />
              </FormField>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Password" htmlFor="password" error={errors.password?.message} required>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
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
          <FormField label="Confirm password" htmlFor="confirmPassword" error={errors.confirmPassword?.message} required>
            <Input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              {...register("confirmPassword")}
            />
          </FormField>
        </div>

        <Button type="submit" className="w-full" disabled={registerUser.isPending}>
          {registerUser.isPending ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
