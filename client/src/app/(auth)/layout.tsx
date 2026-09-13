import Link from "next/link";
import { Logo } from "@/components/common/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-foreground p-10 text-background md:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1.5px 1.5px, currentColor 1.5px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
        <Link href="/" className="relative z-10">
          <Logo size={28} />
        </Link>
        <div className="relative z-10 max-w-md space-y-4">
          <h2 className="text-3xl font-semibold tracking-tight">Build a career that moves with you.</h2>
          <p className="text-background/70">
            AI-powered tools to understand your experience, discover better opportunities, and
            manage your entire career journey in one place.
          </p>
        </div>
        <p className="relative z-10 text-sm text-background/50">
          © {new Date().getFullYear()} CareerSync. All rights reserved.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center bg-background px-6 py-12">
        <div className="mb-8 md:hidden">
          <Link href="/">
            <Logo size={28} />
          </Link>
        </div>
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
