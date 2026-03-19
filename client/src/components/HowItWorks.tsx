export default function HowItWorks() {
  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col items-center text-center gap-4 mb-20">
          <span className="text-primary font-bold tracking-widest uppercase text-sm">Process</span>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white">How It Works</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 relative">
          <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-slate-200 dark:bg-slate-700 -z-10"></div>
          {/* Step 1 */}
          <div className="flex flex-col items-center text-center gap-6">
            <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-primary/30">1</div>
            <h4 className="font-bold text-xl dark:text-white">Create Profile</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">Import your LinkedIn or upload a portfolio to get started.</p>
          </div>
          {/* Step 2 */}
          <div className="flex flex-col items-center text-center gap-6">
            <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-primary/30">2</div>
            <h4 className="font-bold text-xl dark:text-white">AI Matches</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">Our engine identifies roles where you'll actually thrive.</p>
          </div>
          {/* Step 3 */}
          <div className="flex flex-col items-center text-center gap-6">
            <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-primary/30">3</div>
            <h4 className="font-bold text-xl dark:text-white">1-Click Apply</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">No repetitive forms. Apply to multiple roles instantly.</p>
          </div>
          {/* Step 4 */}
          <div className="flex flex-col items-center text-center gap-6">
            <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-primary/30">4</div>
            <h4 className="font-bold text-xl dark:text-white">Track Growth</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">Manage interviews and feedback through your dashboard.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
