import { z } from "zod";
import { isValidPhoneNumber } from "libphonenumber-js";

export const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

const passwordPolicy = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-zA-Z]/, "Password must contain at least one letter")
  .regex(/\d/, "Password must contain at least one number");

const otpCode = z
  .string()
  .trim()
  .length(6, "Enter the 6-digit code")
  .regex(/^\d{6}$/, "Code must be 6 digits");

export const verifyEmailSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  otp: otpCode,
});

export type VerifyEmailFormValues = z.infer<typeof verifyEmailSchema>;

export const resetPasswordSchema = z
  .object({
    email: z.string().min(1, "Email is required").email("Enter a valid email address"),
    otp: otpCode,
    newPassword: passwordPolicy,
    confirmNewPassword: z.string().min(1, "Please confirm your new password"),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmNewPassword) {
      ctx.addIssue({ code: "custom", path: ["confirmNewPassword"], message: "Passwords do not match" });
    }
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export type DeleteAccountFormValues = z.infer<typeof deleteAccountSchema>;

export const registerSchema = z
  .object({
    role: z.enum(["talent", "employer"]),
    name: z.string().trim().min(1, "First name is required").max(50),
    lastName: z.string().trim().min(1, "Last name is required").max(100),
    email: z.string().min(1, "Email is required").email("Enter a valid email address"),
    password: passwordPolicy,
    confirmPassword: z.string().min(1, "Please confirm your password"),
    phone: z
      .string()
      .trim()
      .min(1, "Phone number is required")
      .refine((value) => isValidPhoneNumber(value), "Enter a valid phone number"),
    country: z.string().trim().min(1, "Country is required"),
    city: z.string().trim().min(1, "City is required"),
    companyName: z.string().trim().optional(),
    companySize: z.string().trim().optional(),
    industry: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords do not match",
      });
    }
    if (data.role === "employer") {
      if (!data.companyName?.trim()) {
        ctx.addIssue({ code: "custom", path: ["companyName"], message: "Company name is required" });
      }
      if (!data.companySize?.trim()) {
        ctx.addIssue({ code: "custom", path: ["companySize"], message: "Company size is required" });
      }
      if (!data.industry?.trim()) {
        ctx.addIssue({ code: "custom", path: ["industry"], message: "Industry is required" });
      }
    }
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

export const updateUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(50),
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
});

export type UpdateUserFormValues = z.infer<typeof updateUserSchema>;

export const updatePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordPolicy,
    confirmNewPassword: z.string().min(1, "Please confirm your new password"),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmNewPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmNewPassword"],
        message: "Passwords do not match",
      });
    }
    if (data.oldPassword === data.newPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["newPassword"],
        message: "New password must be different from the old password",
      });
    }
  });

export type UpdatePasswordFormValues = z.infer<typeof updatePasswordSchema>;
