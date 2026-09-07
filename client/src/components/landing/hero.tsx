"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pt-20 pb-16 text-center md:pt-28 md:pb-24">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.4]"
        style={{
          background:
            "radial-gradient(600px circle at 50% 0%, color-mix(in oklab, var(--primary) 12%, transparent), transparent 70%)",
        }}
      />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mx-auto flex max-w-3xl flex-col items-center gap-6"
      >
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
          <Sparkles className="size-3.5 text-accent-violet" /> AI-powered career intelligence
        </span>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl md:text-6xl">
          Your Career. <span className="text-primary">Connected.</span> Intelligent.
        </h1>
        <p className="max-w-xl text-balance text-base text-muted-foreground md:text-lg">
          CareerSync uses AI to understand your experience, match you with better opportunities, and help you
          manage your entire job search — or your entire hiring pipeline — in one place.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button size="lg" render={<Link href="/register" />}>
            Get Started <ArrowRight className="size-4" />
          </Button>
          <Button size="lg" variant="outline" render={<Link href="/organizations" />}>
            Explore Organizations
          </Button>
        </div>
      </motion.div>
    </section>
  );
}
