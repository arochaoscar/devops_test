/**
 * Home Page — Server Component
 *
 * Renders the "Hello, World!" landing page with the greeting form.
 * The reCAPTCHA site key is read server-side from the environment and
 * passed as a prop to the client component — this avoids using
 * NEXT_PUBLIC_ variables, so no secrets are baked into the JS bundle.
 */

import GreetingForm from "@/components/greeting-form";

// Force dynamic rendering so process.env is read at request time,
// not at build time (when RECAPTCHA_SITE_KEY is not available)
export const dynamic = "force-dynamic";

export default function Home() {
  // Read server-side env var — never exposed in client bundle
  const recaptchaSiteKey = process.env.RECAPTCHA_SITE_KEY || "";

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Ambient gradient orbs */}
      <div
        className="fixed top-[-20%] right-[-10%] w-150 h-150 rounded-full opacity-[0.15] blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #7AAAD8 0%, transparent 70%)" }}
      />
      <div
        className="fixed bottom-[-20%] left-[-10%] w-125 h-125 rounded-full opacity-[0.10] blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #4A7EC0 0%, transparent 70%)" }}
      />
      <div
        className="fixed top-[30%] left-[50%] w-100 h-100 rounded-full opacity-[0.08] blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #F5D5C8 0%, transparent 70%)" }}
      />

      <main className="relative z-10 max-w-2xl mx-auto px-6 py-16">
        {/* Header */}
        <header className="mb-16 animate-fade-up">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-xs tracking-[0.3em] uppercase" style={{ color: "var(--sage)" }}>
              csgtest / hello-world
            </span>
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: "var(--primary)" }}
            />
          </div>

          <h1
            className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.1] mb-4"
            style={{ fontFamily: "var(--font-geist-sans)", color: "var(--foreground)" }}
          >
            Hello, World! <span className="wave-hand">👋</span>
          </h1>

          <p className="text-lg" style={{ color: "var(--sage)", fontFamily: "var(--font-geist-sans)" }}>
            Leave your mark. Say hello to the world.
          </p>
        </header>

        {/* Form + Table */}
        <div className="animate-fade-up delay-2">
          <GreetingForm recaptchaSiteKey={recaptchaSiteKey} />
        </div>

        {/* Footer */}
        <footer className="mt-20 pt-8 animate-fade-up delay-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2" style={{ borderTop: "1px solid var(--border)" }}>
          <p className="text-xs" style={{ color: "var(--sage)" }}>
            PagerDuty CSG Innovation Team — DevOps Take Home Exercise
          </p>
          <p className="text-xs" style={{ color: "var(--sage)" }}>
            Powered by{" "}
            <a
              href="https://github.com/arochaoscar"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-link transition-colors duration-200"
            >
              Oscar Arocha
            </a>
            {" — "}
            <a
              href="https://github.com/arochaoscar/devops_test"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-link transition-colors duration-200"
            >
              GitHub Repo
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}
