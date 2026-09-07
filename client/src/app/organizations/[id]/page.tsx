"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Globe, Mail, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/common/error-state";
import { Loading } from "@/components/common/loading";
import { useCurrentUser } from "@/hooks/use-auth";
import {
  useFollowOrganization,
  useIsFollowingOrganization,
  useOrganizationFollowerCount,
  usePublicOrganization,
} from "@/hooks/use-organizations";
import { toast } from "sonner";
import { ApiError } from "@/types/api";

export default function PublicOrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const orgQuery = usePublicOrganization(id);
  const followerCountQuery = useOrganizationFollowerCount(id);
  const { data: user } = useCurrentUser();
  const isTalent = user?.role === "talent";
  const isFollowingQuery = useIsFollowingOrganization(id, isTalent);
  const followOrg = useFollowOrganization(id);

  if (orgQuery.isLoading) return <Loading label="Loading organization…" />;
  if (orgQuery.isError || !orgQuery.data) {
    return <ErrorState error={orgQuery.error} onRetry={() => orgQuery.refetch()} />;
  }

  const org = orgQuery.data;

  async function handleFollow() {
    try {
      const result = await followOrg.mutateAsync();
      toast.success(result.message);
    } catch (error) {
      if (error instanceof ApiError) toast.error(error.message);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/organizations" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to organizations
      </Link>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{org.name}</h1>
          <p className="text-sm text-muted-foreground">
            {org.industry} · {org.companySize} employees
          </p>
        </div>
        {isTalent && (
          <Button
            variant={isFollowingQuery.data ? "outline" : "default"}
            onClick={handleFollow}
            disabled={followOrg.isPending || isFollowingQuery.data}
          >
            {isFollowingQuery.data ? "Following" : "Follow"}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <MapPin className="size-4" /> {org.hqLocation}
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="size-4" /> {followerCountQuery.data ?? org.followers?.length ?? 0} followers
        </span>
        {org.website && (
          <a href={org.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-foreground">
            <Globe className="size-4" /> Website
          </a>
        )}
        <span className="flex items-center gap-1.5">
          <Mail className="size-4" /> {org.hiringContactEmail}
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{org.description}</p>
        </CardContent>
      </Card>

      {(org.mission || org.culture) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {org.mission && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Mission</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{org.mission}</p>
              </CardContent>
            </Card>
          )}
          {org.culture && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Culture</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{org.culture}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {org.awards && org.awards.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {org.awards.map((award) => (
            <Badge key={award} variant="outline">
              {award}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
