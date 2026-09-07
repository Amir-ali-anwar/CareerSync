import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/common/logo";

export function CtaSection() {
  return (
    <section className="px-4 py-16 md:py-24">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 rounded-2xl border border-border bg-card px-8 py-14 text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground">Ready to move your career forward?</h2>
        <p className="max-w-md text-muted-foreground">
          Join CareerSync today — whether you&apos;re looking for your next role or your next hire.
        </p>
        <Button size="lg" render={<Link href="/register" />}>
          Get Started
        </Button>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border px-4 py-8 md:px-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
        <Logo size={22} />
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} CareerSync. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
