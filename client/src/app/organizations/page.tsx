"use client";

import Link from "next/link";
import { Building2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { usePublicOrganizations } from "@/hooks/use-organizations";

export default function PublicOrganizationsPage() {
  const query = usePublicOrganizations();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Organizations</h1>
        <p className="text-sm text-muted-foreground">Explore companies hiring on CareerSync.</p>
      </div>

      {query.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (query.data?.allOrganizations.length || 0) === 0 ? (
        <EmptyState icon={Building2} title="No organizations yet" description="Check back soon." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {query.data?.allOrganizations.map((org) => (
            <Link key={org._id} href={`/organizations/${org._id}`}>
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    <span className="truncate">{org.name}</span>
                    <Badge variant="secondary" className="shrink-0">
                      {org.industry}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="line-clamp-2 text-sm text-muted-foreground">{org.description}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{org.hqLocation}</span>
                    <span className="flex items-center gap-1">
                      <Users className="size-3.5" /> {org.followers?.length || 0}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
