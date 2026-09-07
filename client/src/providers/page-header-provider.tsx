"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

interface PageHeaderValue {
  title: string;
  description?: string;
}

interface PageHeaderContextValue {
  header: PageHeaderValue | null;
  setHeader: (value: PageHeaderValue | null) => void;
}

const PageHeaderContext = createContext<PageHeaderContextValue | undefined>(undefined);

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [header, setHeader] = useState<PageHeaderValue | null>(null);
  const value = useMemo(() => ({ header, setHeader }), [header]);
  return <PageHeaderContext.Provider value={value}>{children}</PageHeaderContext.Provider>;
}

export function usePageHeaderContext() {
  const ctx = useContext(PageHeaderContext);
  if (!ctx) throw new Error("usePageHeaderContext must be used within a PageHeaderProvider");
  return ctx;
}

/**
 * Called once per dashboard page to set the shared Header's title/description - the
 * single source of truth for the page heading, replacing each page's own in-content
 * <h1>. Re-runs whenever title/description change (e.g. a job detail page's title
 * resolving once the job loads), and clears itself on unmount so a stale title never
 * lingers into the next page during client-side navigation.
 */
export function usePageHeader(title: string, description?: string) {
  const { setHeader } = usePageHeaderContext();

  useEffect(() => {
    setHeader({ title, description });
    return () => setHeader(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description]);
}

/**
 * The desktop Header renders the current page title (see components/common/header.tsx),
 * but the header collapses to just the logo on mobile (< md) to save space. Drop this
 * once near the top of a page's content so mobile still shows a title - it renders
 * nothing at md and above, where the Header already has it covered.
 */
export function MobilePageHeader() {
  const { header } = usePageHeaderContext();
  if (!header) return null;
  return (
    <div className="md:hidden">
      <h1 className="text-xl font-semibold tracking-tight text-foreground">{header.title}</h1>
      {header.description && <p className="text-sm text-muted-foreground">{header.description}</p>}
    </div>
  );
}
