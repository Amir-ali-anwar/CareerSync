"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/providers/auth-provider";
import { PageHeaderProvider } from "@/providers/page-header-provider";
import { Sidebar } from "@/components/common/sidebar";
import { Header } from "@/components/common/header";
import { MobileNav } from "@/components/common/mobile-nav";
import { Loading } from "@/components/common/loading";
import { useNotificationSocket } from "@/hooks/use-notifications";

function DashboardGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading, isError } = useAuth();
  useNotificationSocket(Boolean(user));

  useEffect(() => {
    if (!isLoading && (isError || !user)) {
      router.replace("/login");
    }
  }, [isLoading, isError, user, router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loading label="Loading your workspace…" />
      </div>
    );
  }

  return (
    <PageHeaderProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="flex-1 px-4 pt-6 pb-24 md:px-6 md:pb-10 lg:px-10">
            <div className="mx-auto w-full max-w-[1440px]">{children}</div>
          </main>
          <MobileNav />
        </div>
      </div>
    </PageHeaderProvider>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardGate>{children}</DashboardGate>
    </AuthProvider>
  );
}
