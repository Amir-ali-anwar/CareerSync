const STEPS = [
  { step: "1", title: "Create your account", description: "Sign up as a candidate or an employer in under a minute." },
  { step: "2", title: "Post a job or browse", description: "Employers post roles; candidates search or use semantic search." },
  { step: "3", title: "Apply with your resume", description: "AI analyzes your resume to power matching automatically." },
  { step: "4", title: "See your match score", description: "Get a transparent, explainable match score for every role." },
  { step: "5", title: "Track the journey", description: "Manage every application or applicant from one dashboard." },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-secondary/40 px-4 py-16 md:py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto mb-12 max-w-xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">How it works</h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((item) => (
            <div key={item.step} className="space-y-2">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {item.step}
              </span>
              <h3 className="font-semibold text-foreground">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
