export default function PremiumFeatures() {
  return (
    <section className="py-24 bg-white/50 dark:bg-slate-900/50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col items-center text-center gap-4 mb-20">
          <span className="text-primary font-bold tracking-widest uppercase text-sm">Capabilities</span>
          <h2 className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white">Premium Features</h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl text-lg">Designed for high-growth teams and ambitious professionals who value speed and quality.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="group p-8 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary/50 transition-all hover:shadow-2xl hover:shadow-primary/5">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-primary text-3xl">psychology</span>
            </div>
            <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">AI Job Matching</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">Smart algorithms that understand your potential beyond just keywords on a resume.</p>
          </div>
          {/* Card 2 */}
          <div className="group p-8 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary/50 transition-all hover:shadow-2xl hover:shadow-primary/5">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-primary text-3xl">verified</span>
            </div>
            <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">Skill-based Hiring</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">Move beyond resumes with verified skill assessments that prove your expertise.</p>
          </div>
          {/* Card 3 */}
          <div className="group p-8 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary/50 transition-all hover:shadow-2xl hover:shadow-primary/5">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-primary text-3xl">videocam</span>
            </div>
            <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">Video Pitch Applications</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">Stand out from the crowd with personalized video intros that showcase your personality.</p>
          </div>
          {/* Card 4 */}
          <div className="group p-8 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary/50 transition-all hover:shadow-2xl hover:shadow-primary/5">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-primary text-3xl">public</span>
            </div>
            <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">Remote Job Discovery</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">Global opportunities at your fingertips, filtered by time zone and work culture.</p>
          </div>
          {/* Card 5 */}
          <div className="group p-8 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary/50 transition-all hover:shadow-2xl hover:shadow-primary/5 md:col-span-2 lg:col-span-1">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-primary text-3xl">moving</span>
            </div>
            <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">Career Path Tracking</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">Visualize and plan your professional growth journey with AI-driven milestones.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
