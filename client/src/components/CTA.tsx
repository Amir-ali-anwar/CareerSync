export default function CTA() {
  return (
    <section className="py-24">
      <div className="max-w-5xl mx-auto px-6">
        <div className="bg-primary rounded-[2.5rem] p-12 lg:p-20 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent)]"></div>
          <h2 className="text-4xl lg:text-5xl font-black text-white mb-6 relative z-10">Ready to accelerate your career?</h2>
          <p className="text-white/80 text-lg mb-10 max-w-xl mx-auto relative z-10">Join 50,000+ others finding their dream roles through AI discovery. It's free to start.</p>
          <div className="flex flex-wrap justify-center gap-4 relative z-10">
            <button className="bg-white text-primary hover:bg-slate-100 text-lg font-bold px-10 py-4 rounded-xl shadow-xl transition-all active:scale-95">Get Started Now</button>
            <button className="bg-primary/20 hover:bg-primary/30 border border-white/30 text-white text-lg font-bold px-10 py-4 rounded-xl transition-all">Schedule Demo</button>
          </div>
        </div>
      </div>
    </section>
  );
}
