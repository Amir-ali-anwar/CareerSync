export default function HeroSection() {
  return (
    <section className="relative overflow-hidden py-24 lg:py-32">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-primary/20 blur-[100px] rounded-full"></div>
      </div>
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div className="flex flex-col gap-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 w-fit">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-xs font-bold text-primary tracking-wide uppercase">New: V2 Engine Live</span>
          </div>
          <h1 className="text-5xl lg:text-7xl font-black text-slate-900 dark:text-white leading-[1.1] tracking-tight">
            AI-Powered <span className="text-primary">Career</span> Matching
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
            Experience the future of recruitment with intelligent discovery that connects the right talent to the right roles instantly, skipping the resume noise.
          </p>
          <div className="flex flex-wrap gap-4">
            <button className="bg-primary hover:bg-primary/90 text-white text-lg font-bold px-8 py-4 rounded-xl shadow-xl shadow-primary/30 flex items-center gap-2 transition-all group">
              Find Jobs
              <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </button>
            <button className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary/40 text-slate-900 dark:text-white text-lg font-bold px-8 py-4 rounded-xl shadow-sm transition-all">
              Post a Job
            </button>
          </div>
          <div className="flex items-center gap-4 pt-4">
            <div className="flex -space-x-3">
              <div className="w-10 h-10 rounded-full border-2 border-background-light dark:border-background-dark bg-slate-200 bg-cover bg-center" data-alt="Avatar of a happy professional user" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBN3hQL41t6XhNrtyc5YpXMK08lHo0FMZ1pR5Auf9Fn4eFazMgB2ZMOm0TFVJO3_SPDWI_1xVcEd9dJ8QC5pIHuz8GPCh3cIjsJ1ZYmFcEeTLqD0OAA5x1Iy5ffY7j7jzeMdCnGjX-eUfsan6oyJiLEwv28Xy3UjBicErlMOZSw3MMaoc86XOBV2_dh8Rr529ZIwhNPb68XWfepJqdJwf-ZcUOABEWdF-C8UnNLxZrKuJm2cpUhMhJX5-sa8QF8xemRMyyqfKQVDxY')" }}></div>
              <div className="w-10 h-10 rounded-full border-2 border-background-light dark:border-background-dark bg-slate-200 bg-cover bg-center" data-alt="Avatar of a creative talent user" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuABqIK6FbEgvdlf1WdPRxBx7EN-hvgZedmf1iokT40SFnnNjPuZ2iLSwlehbUynqSgPDwADZ1bODtPLIyjqo_FHHqgvBhWiHb31caJ4lOLKdhwY-RjjPD_8JZh5HT6E_ZspGJrHwzdOYYpeSa7EmCkqcOnO7OuSZA25w1x54rxJGlBWMTKK_GYqPqwme8cTH7wfC-AQE0qd_2ZB6BrBAgV5eeY-wZQfUw7-g6zxJvNdCAyz6e-93i43eTnMYS7wLWlKf0vGA1xuDqA')" }}></div>
              <div className="w-10 h-10 rounded-full border-2 border-background-light dark:border-background-dark bg-slate-200 bg-cover bg-center" data-alt="Avatar of a tech developer user" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBMo1cXti8lEDChjtRsoXajsjJjiv7aX3xklBUn1JBgU0N-IUwuFAh3c9VgUoM3M2wY6KQcmMyrLBEmLmd3c5ayYVfNxwRuKCHOVnwjmqykRlWBsrcxiMA_Se-rLvmkmbDq4mdjG4lJZol5jP3ymc6SyIC6WEpBQBKejymVX1y8ZjmeVZs-3UMtghP06adKqb7KikPKMH5lYd1r7M94hcOhW764SjC5-m44YiYJK2wZUIuXVq30U7NtCF7TVYGNa6iaQErLNklnr2s')" }}></div>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Joined by <span className="text-slate-900 dark:text-white font-bold">10k+</span> professionals this month</p>
          </div>
        </div>
        <div className="relative">
          <div className="aspect-square rounded-3xl bg-primary/5 border border-primary/10 overflow-hidden shadow-2xl relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent opacity-50"></div>
            <img className="w-full h-full object-cover" data-alt="Dashboard showing AI job matching interface with candidate cards" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBouDsqrbgyc_GdHdzWXDt6Kn557fJbFBy4DBM91m-jLpZLAro9Gx86ighraYAyCZ-8i1FLKCfcgJY1m5xJcf5h2zVlVPXE6mJA7aqUI5zKHUD5exl_UfjxKDRlnGCtqRfXzpF8XmxvOEbWaZzCwRLj6_YBVgduwg7PQ0pz0kxrtX8zmUBmG1DWby7XjaIEk_xFoXhq4pbTBMz2DOWzceDM4S6ebjPkD7koYrdUCAZavkW4ulXtzM8HYcbM77Qvw1qDPj_mJ4jgPeI" alt="" />
            {/* Floating elements */}
            <div className="absolute top-10 -left-10 glass-card p-4 rounded-2xl shadow-xl border border-white/20 w-48">
              <div className="flex items-center gap-3 mb-2">
                <span className="material-symbols-outlined text-green-500">check_circle</span>
                <span className="text-xs font-bold text-slate-800">Match Found</span>
              </div>
              <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-primary w-[94%]"></div>
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">94% Compatibility</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
