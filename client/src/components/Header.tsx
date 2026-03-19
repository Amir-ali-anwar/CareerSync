import Link from "next/link";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-primary/10 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-white text-2xl">auto_awesome</span>
          </div>
          <h2 className="text-slate-900 dark:text-white text-xl font-extrabold tracking-tight">CareerSync</h2>
        </div>
        <nav className="hidden md:flex items-center gap-10">
          <Link className="text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-primary transition-colors" href="#">Features</Link>
          <Link className="text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-primary transition-colors" href="#">How it Works</Link>
          <Link className="text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-primary transition-colors" href="#">Testimonials</Link>
          <Link className="text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-primary transition-colors" href="#">Pricing</Link>
        </nav>
        <div className="flex items-center gap-4">
          <button className="hidden sm:block text-sm font-bold text-slate-700 dark:text-slate-300 px-4 py-2 hover:bg-primary/5 rounded-lg transition-all">Log In</button>
          <button className="bg-primary hover:bg-primary/90 text-white text-sm font-bold px-6 py-2.5 rounded-lg shadow-lg shadow-primary/25 transition-all active:scale-95">
            Get Started
          </button>
        </div>
      </div>
    </header>
  );
}
