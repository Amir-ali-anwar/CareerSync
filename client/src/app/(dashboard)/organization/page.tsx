"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Building2, Plus, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { RoleGuard } from "@/components/common/role-guard";
import { OrganizationForm } from "@/components/organizations/organization-form";
import { MobilePageHeader, usePageHeader } from "@/providers/page-header-provider";
import {
  useCreateOrganization,
  useDeleteOrganization,
  useMyOrganizations,
  useUpdateOrganization,
} from "@/hooks/use-organizations";
import { ApiError } from "@/types/api";
import type { Organization, OrganizationFormPayload } from "@/types/organization";

const MAX_ORGS = 4;

function EditOrganizationForm({ organization, onDone }: { organization: Organization; onDone: () => void }) {
  const updateOrg = useUpdateOrganization(organization._id);

  async function handleSubmit(payload: OrganizationFormPayload) {
    try {
      await updateOrg.mutateAsync(payload);
      toast.success("Organization updated");
      onDone();
    } catch (error) {
      if (error instanceof ApiError) toast.error(error.message);
    }
  }

  return (
    <OrganizationForm
      initialOrganization={organization}
      onSubmit={handleSubmit}
      isSubmitting={updateOrg.isPending}
      submitLabel="Save changes"
    />
  );
}

export default function OrganizationPage() {
  return (
    <RoleGuard role="employer">
      <OrganizationManager />
    </RoleGuard>
  );
}

function OrganizationManager() {
  const orgsQuery = useMyOrganizations();
  const createOrg = useCreateOrganization();
  const deleteOrg = useDeleteOrganization();
  const [mode, setMode] = useState<"list" | "create" | string>("list");

  const organizations = orgsQuery.data?.organizationListing || [];
  const editingOrgPreview = organizations.find((o) => o._id === mode);

  usePageHeader(
    mode === "create" ? "Create organization" : editingOrgPreview ? `Edit ${editingOrgPreview.name}` : "Organization",
    mode === "list" ? `Manage your company profiles (${organizations.length}/${MAX_ORGS} used).` : undefined
  );

  async function handleCreate(payload: OrganizationFormPayload) {
    try {
      await createOrg.mutateAsync(payload);
      toast.success("Organization created");
      setMode("list");
    } catch (error) {
      if (error instanceof ApiError) toast.error(error.message);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteOrg.mutateAsync(id);
      toast.success("Organization deleted");
    } catch (error) {
      if (error instanceof ApiError) toast.error(error.message);
    }
  }

  if (mode === "create") {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <MobilePageHeader />
          <Button variant="link" className="h-auto p-0" onClick={() => setMode("list")}>
            ← Back to organizations
          </Button>
        </div>
        <OrganizationForm onSubmit={handleCreate} isSubmitting={createOrg.isPending} submitLabel="Create organization" />
      </div>
    );
  }

  const editingOrg = organizations.find((o) => o._id === mode);
  if (editingOrg) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <MobilePageHeader />
          <Button variant="link" className="h-auto p-0" onClick={() => setMode("list")}>
            ← Back to organizations
          </Button>
        </div>
        <EditOrganizationForm organization={editingOrg} onDone={() => setMode("list")} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <MobilePageHeader />
        {organizations.length < MAX_ORGS && (
          <Button onClick={() => setMode("create")}>
            <Plus className="size-4" /> New organization
          </Button>
        )}
      </div>

      {orgsQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : orgsQuery.isError ? (
        <ErrorState error={orgsQuery.error} onRetry={() => orgsQuery.refetch()} />
      ) : organizations.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No organizations yet"
          description="Create your company profile so talent can discover and follow you."
          action={<Button onClick={() => setMode("create")}>Create organization</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {organizations.map((org) => (
            <Card key={org._id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {org.name}
                  <Badge variant="secondary">{org.companySize}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="line-clamp-2 text-sm text-muted-foreground">{org.description}</p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="size-3.5" /> {org.followers?.length || 0} followers
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setMode(org._id)}>
                    Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>
                      <Trash2 className="size-4" /> Delete
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {org.name}?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(org._id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
