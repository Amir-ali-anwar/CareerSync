"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FormField } from "@/components/common/form-field";
import { MobilePageHeader, usePageHeader } from "@/providers/page-header-provider";
import { useAuth } from "@/providers/auth-provider";
import { useDeleteAccount, useUpdateUser, useUpdateUserPassword } from "@/hooks/use-auth";
import {
  updatePasswordSchema,
  updateUserSchema,
  type UpdatePasswordFormValues,
  type UpdateUserFormValues,
} from "@/lib/validation/auth";
import { ApiError } from "@/types/api";

function AccountSection() {
  const { user } = useAuth();
  const updateUser = useUpdateUser();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateUserFormValues>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: { name: user?.name || "", email: "" },
  });

  async function onSubmit(values: UpdateUserFormValues) {
    try {
      const result = await updateUser.mutateAsync(values);
      toast.success(result.msg || "Profile updated");
    } catch (error) {
      if (error instanceof ApiError) toast.error(error.message);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
        <CardDescription>Update your name and email address.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField label="Name" htmlFor="name" error={errors.name?.message} required>
            <Input id="name" {...register("name")} />
          </FormField>
          <FormField
            label="Email"
            htmlFor="email"
            error={errors.email?.message}
            required
            hint="Changing your email will require re-verification."
          >
            <Input id="email" type="email" {...register("email")} />
          </FormField>
          <Button type="submit" disabled={updateUser.isPending}>
            {updateUser.isPending ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function PasswordSection() {
  const updatePassword = useUpdateUserPassword();
  const [show, setShow] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdatePasswordFormValues>({ resolver: zodResolver(updatePasswordSchema) });

  async function onSubmit(values: UpdatePasswordFormValues) {
    try {
      await updatePassword.mutateAsync(values);
      toast.success("Password updated");
      reset();
    } catch (error) {
      if (error instanceof ApiError) toast.error(error.message);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>Change your account password.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField label="Current password" htmlFor="oldPassword" error={errors.oldPassword?.message} required>
            <Input id="oldPassword" type={show ? "text" : "password"} autoComplete="current-password" {...register("oldPassword")} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="New password" htmlFor="newPassword" error={errors.newPassword?.message} required>
              <Input id="newPassword" type={show ? "text" : "password"} autoComplete="new-password" {...register("newPassword")} />
            </FormField>
            <FormField
              label="Confirm new password"
              htmlFor="confirmNewPassword"
              error={errors.confirmNewPassword?.message}
              required
            >
              <Input
                id="confirmNewPassword"
                type={show ? "text" : "password"}
                autoComplete="new-password"
                {...register("confirmNewPassword")}
              />
            </FormField>
          </div>
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            {show ? "Hide passwords" : "Show passwords"}
          </button>
          <div>
            <Button type="submit" disabled={updatePassword.isPending}>
              {updatePassword.isPending ? "Updating…" : "Update password"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function DangerZoneSection() {
  const router = useRouter();
  const deleteAccount = useDeleteAccount();
  const [password, setPassword] = useState("");

  async function handleDelete() {
    if (!password) {
      toast.error("Please enter your password to confirm");
      return;
    }
    try {
      await deleteAccount.mutateAsync({ password });
      toast.success("Account deleted");
      router.replace("/login");
    } catch (error) {
      if (error instanceof ApiError) toast.error(error.message);
    }
  }

  return (
    <Card className="border-error/30">
      <CardHeader>
        <CardTitle className="text-error">Danger Zone</CardTitle>
        <CardDescription>Permanently delete your account and all associated data.</CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog onOpenChange={(open) => !open && setPassword("")}>
          <AlertDialogTrigger render={<Button variant="destructive" />}>
            <Trash2 className="size-4" /> Delete account
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes your account and all associated data. This cannot be undone. Enter your
                password to confirm.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={deleteAccount.isPending}>
                Delete account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  usePageHeader("Settings", "Manage your account details.");
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <MobilePageHeader />
      <AccountSection />
      <PasswordSection />
      <DangerZoneSection />
    </div>
  );
}
