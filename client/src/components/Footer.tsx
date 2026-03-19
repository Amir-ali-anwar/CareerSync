import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-background-light dark:bg-background-dark border-t border-slate-200 dark:border-slate-800 py-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-12">
          <div className="col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="size-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-xl">auto_awesome</span>
              </div>
              <h2 className="text-slate-900 dark:text-white text-xl font-extrabold">CareerSync</h2>
            </div>
            <p className="text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">The next generation hiring platform powered by high-fidelity AI matching.</p>
          </div>
          <div>
            <h5 className="font-bold text-slate-900 dark:text-white mb-6 uppercase text-xs tracking-widest">Platform</h5>
            <ul className="flex flex-col gap-4">
              <li><Link className="text-sm text-slate-500 dark:text-slate-400 hover:text-primary transition-colors" href="#">Features</Link></li>
              <li><Link className="text-sm text-slate-500 dark:text-slate-400 hover:text-primary transition-colors" href="#">Pricing</Link></li>
              <li><Link className="text-sm text-slate-500 dark:text-slate-400 hover:text-primary transition-colors" href="#">Enterprise</Link></li>
              <li><Link className="text-sm text-slate-500 dark:text-slate-400 hover:text-primary transition-colors" href="#">Changelog</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-slate-900 dark:text-white mb-6 uppercase text-xs tracking-widest">Company</h5>
            <ul className="flex flex-col gap-4">
              <li><Link className="text-sm text-slate-500 dark:text-slate-400 hover:text-primary transition-colors" href="#">About Us</Link></li>
              <li><Link className="text-sm text-slate-500 dark:text-slate-400 hover:text-primary transition-colors" href="#">Careers</Link></li>
              <li><Link className="text-sm text-slate-500 dark:text-slate-400 hover:text-primary transition-colors" href="#">Blog</Link></li>
              <li><Link className="text-sm text-slate-500 dark:text-slate-400 hover:text-primary transition-colors" href="#">Press</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-slate-900 dark:text-white mb-6 uppercase text-xs tracking-widest">Resources</h5>
            <ul className="flex flex-col gap-4">
              <li><Link className="text-sm text-slate-500 dark:text-slate-400 hover:text-primary transition-colors" href="#">Documentation</Link></li>
              <li><Link className="text-sm text-slate-500 dark:text-slate-400 hover:text-primary transition-colors" href="#">Help Center</Link></li>
              <li><Link className="text-sm text-slate-500 dark:text-slate-400 hover:text-primary transition-colors" href="#">Community</Link></li>
              <li><Link className="text-sm text-slate-500 dark:text-slate-400 hover:text-primary transition-colors" href="#">Privacy</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold text-slate-900 dark:text-white mb-6 uppercase text-xs tracking-widest">Social</h5>
            <ul className="flex flex-col gap-4">
              <li><Link className="text-sm text-slate-500 dark:text-slate-400 hover:text-primary transition-colors" href="#">Twitter</Link></li>
              <li><Link className="text-sm text-slate-500 dark:text-slate-400 hover:text-primary transition-colors" href="#">LinkedIn</Link></li>
              <li><Link className="text-sm text-slate-500 dark:text-slate-400 hover:text-primary transition-colors" href="#">Instagram</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-20 pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">© 2024 CareerSync Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link className="text-xs text-slate-400 hover:text-primary" href="#">Cookie Settings</Link>
            <Link className="text-xs text-slate-400 hover:text-primary" href="#">Status</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
