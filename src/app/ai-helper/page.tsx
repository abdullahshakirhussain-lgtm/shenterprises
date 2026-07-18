import type { Metadata } from "next";
import ProjectAssistantClient from "./ProjectAssistantClient";

export const metadata: Metadata = {
  title: "AI Project Helper — Tell us what you're making",
  description:
    "Describe your sewing or craft project and our AI suggests exactly what threads, zippers, buttons and trims you'll need from SH Enterprises.",
  alternates: { canonical: "/ai-helper" },
};

export default function AIHelperPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 md:py-14">
      <div className="text-center mb-8 reveal">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-100 text-brand-800 text-xs font-bold tracking-wide uppercase mb-3">
          ✨ AI Powered
        </div>
        <h1 className="font-serif font-bold text-3xl sm:text-4xl mb-2">Project Helper</h1>
        <p className="text-muted text-base sm:text-lg max-w-xl mx-auto">
          Tell us what you&apos;re making and we&apos;ll pick exactly what you need.
        </p>
      </div>
      <ProjectAssistantClient />
    </main>
  );
}
