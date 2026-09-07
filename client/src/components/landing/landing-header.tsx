import Link from "next/link";
import { Logo } from "@/components/common/logo";
import { Button } from "@/components/ui/button";

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur md:px-8">
      <Link href="/">
        <Logo size={26} />
      </Link>
      <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
        <a href="#features" className="hover:text-foreground">
          Features
        </a>
        <a href="#how-it-works" className="hover:text-foreground">
          How it works
        </a>
        <Link href="/organizations" className="hover:text-foreground">
          Organizations
        </Link>
      </nav>
      <div className="flex items-center gap-2">
        <Button variant="ghost" render={<Link href="/login" />}>
          Sign in
        </Button>
        <Button render={<Link href="/register" />}>Get started</Button>
      </div>
    </header>
  );
}
