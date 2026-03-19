export default function TrustedBy() {
  return (
    <section className="py-12 border-y border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-6">
        <p className="text-center text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-10">Trusted by industry leaders</p>
        <div className="flex flex-wrap justify-center items-center gap-12 lg:gap-24 grayscale opacity-50 contrast-125">
          <span className="text-2xl font-bold dark:text-white">TechFlow</span>
          <span className="text-2xl font-bold dark:text-white">Aether</span>
          <span className="text-2xl font-bold dark:text-white">Vertex</span>
          <span className="text-2xl font-bold dark:text-white">Novas</span>
          <span className="text-2xl font-bold dark:text-white">Pulse</span>
        </div>
      </div>
    </section>
  );
}
