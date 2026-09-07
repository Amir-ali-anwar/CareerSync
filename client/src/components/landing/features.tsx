import { Search, Sparkles, Target, ClipboardList, TrendingUp } from "lucide-react";

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI Resume Intelligence",
    description: "Attach your resume when you apply and CareerSync extracts your skills, experience, and domains automatically.",
  },
  {
    icon: Target,
    title: "Smart Job Matching",
    description: "See a transparent, component-by-component match score for every role against your real profile.",
  },
  {
    icon: Search,
    title: "Semantic Job Search",
    description: 'Search naturally — "remote AI engineering roles requiring React and Python" — and get ranked results.',
  },
  {
    icon: ClipboardList,
    title: "Application Tracking",
    description: "Track every application's status from submitted to interview, in a table or a Kanban board.",
  },
  {
    icon: TrendingUp,
    title: "Hiring Intelligence for Employers",
    description: "Post jobs, review AI-ranked applicants, and manage your company profile — all in one dashboard.",
  },
];

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-5xl px-4 py-16 md:py-24">
      <div className="mx-auto mb-12 max-w-xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground">Everything your career needs</h2>
        <p className="mt-3 text-muted-foreground">Built for both sides of the job market.</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="rounded-xl border border-border bg-card p-6">
            <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-primary-light text-primary">
              <feature.icon className="size-5" />
            </div>
            <h3 className="mb-1.5 font-semibold text-foreground">{feature.title}</h3>
            <p className="text-sm text-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
