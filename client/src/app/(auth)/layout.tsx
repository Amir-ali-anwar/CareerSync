import Link from "next/link";
import { Logo } from "@/components/common/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[#102522] p-10 text-background md:flex lg:p-14">
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
        <div className="relative z-10 max-w-lg space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-200">Your career, connected</p>
          <h2 className="text-4xl font-semibold leading-tight tracking-tight lg:text-5xl">Make your next move with better signal.</h2>
          <p className="max-w-md text-base leading-7 text-background/70">
            AI-powered tools to understand your experience, discover better opportunities, and
            manage your entire career journey in one place.
          </p>
          <div className="flex items-center gap-3 pt-3 text-sm text-background/70">
            <span className="flex size-8 items-center justify-center rounded-full bg-teal-300/15 text-teal-200">01</span>
            A clearer view of where you can go next
          </div>
        </div>
        <p className="relative z-10 text-sm text-background/50">
          © {new Date().getFullYear()} CareerSync. All rights reserved.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center bg-background px-6 py-12 md:px-10">
        <div className="mb-8 md:hidden">
          <Link href="/">
            <Logo size={28} />
          </Link>
        </div>
        <div className="w-full max-w-sm rounded-2xl border border-border/80 bg-card p-6 shadow-[0_20px_60px_-36px_rgba(15,118,110,0.45)] md:p-8">{children}</div>
      </div>
    </div>
  );
}
