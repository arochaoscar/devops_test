"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { getGreetings, createGreeting, type Greeting } from "@/app/actions";

interface GreetingFormProps {
  recaptchaSiteKey: string;
}

export default function GreetingForm({ recaptchaSiteKey }: GreetingFormProps) {
  const [name, setName] = useState("");
  const [greetings, setGreetings] = useState<Greeting[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const fetchGreetings = useCallback(async () => {
    try {
      const data = await getGreetings();
      setGreetings(data);
    } catch {
      console.error("Failed to fetch greetings");
    }
  }, []);

  useEffect(() => {
    fetchGreetings();
  }, [fetchGreetings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }

    if (recaptchaSiteKey && !captchaToken) {
      setError("Please complete the captcha");
      return;
    }

    setLoading(true);

    try {
      const result = await createGreeting(name.trim(), captchaToken);

      if (result.error) {
        setError(result.error);
        return;
      }

      setGreetings(result.greetings);
      setName("");
      setSuccess(true);
      setCaptchaToken(null);
      recaptchaRef.current?.reset();
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string | Date) => {
    return new Date(dateStr).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getAvatarColors = (name: string) => {
    const palette = [
      { bg: "#EBF2FB", fg: "#2F5EA0" },
      { bg: "#F5D5C8", fg: "#A85C3E" },
      { bg: "#D4E8F8", fg: "#4A7EC0" },
      { bg: "#FCE8E0", fg: "#D4846A" },
      { bg: "#E0ECF9", fg: "#2F5EA0" },
    ];
    const index = name.charCodeAt(0) % palette.length;
    return palette[index];
  };

  return (
    <div className="space-y-10">
      {/* Form Card */}
      <div
        className="rounded-xl p-6 sm:p-8"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        <div className="flex items-center gap-2 mb-6">
          <span
            className="inline-block w-3 h-3 rounded-full"
            style={{ background: "var(--accent)" }}
          />
          <span
            className="inline-block w-3 h-3 rounded-full"
            style={{ background: "var(--primary-light)" }}
          />
          <span
            className="inline-block w-3 h-3 rounded-full"
            style={{ background: "var(--primary)" }}
          />
          <span
            className="ml-3 text-xs tracking-wider uppercase"
            style={{ color: "var(--sage)" }}
          >
            new greeting
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="name"
              className="block text-sm mb-2"
              style={{ color: "var(--sage)", fontFamily: "var(--font-geist-sans)" }}
            >
              Leave your name to say Hello
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              placeholder="$ enter your name..."
              maxLength={255}
              className="input-glow w-full px-4 py-3 rounded-lg text-base outline-none transition-all duration-200"
              style={{
                background: "var(--background)",
                border: "1px solid var(--border)",
                color: "var(--foreground)",
                fontFamily: "var(--font-geist-mono)",
              }}
            />
          </div>

          {recaptchaSiteKey && (
            <div>
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={recaptchaSiteKey}
                theme="dark"
                onChange={(token) => setCaptchaToken(token)}
                onExpired={() => setCaptchaToken(null)}
              />
            </div>
          )}

          {error && (
            <div
              className="flex items-center gap-2 text-sm px-3 py-2 rounded-md"
              style={{ background: "var(--accent-subtle)", color: "var(--accent-dark)" }}
            >
              <span>✕</span> {error}
            </div>
          )}

          {success && (
            <div
              className="flex items-center gap-2 text-sm px-3 py-2 rounded-md"
              style={{ background: "var(--primary-subtle)", color: "var(--primary-dark)" }}
            >
              <span>✓</span> Hello sent successfully!
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (!!recaptchaSiteKey && !captchaToken)}
            className="btn-shimmer w-full sm:w-auto px-8 py-3 rounded-lg font-medium text-sm tracking-wide uppercase transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: loading ? "var(--primary-dark)" : "var(--primary)",
              color: "#FFFFFF",
              fontFamily: "var(--font-geist-sans)",
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: "transparent", borderTopColor: "var(--background)" }} />
                Sending...
              </span>
            ) : (
              "Say Hello →"
            )}
          </button>
        </form>
      </div>

      {/* Greetings Log */}
      {greetings.length > 0 && (
        <div className="animate-fade-up delay-3">
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-lg font-medium"
              style={{ color: "var(--foreground)", fontFamily: "var(--font-geist-sans)" }}
            >
              All these people have said Hello
            </h2>
            <span
              className="text-xs px-2.5 py-1 rounded-full"
              style={{ background: "var(--primary-subtle)", color: "var(--primary)", border: "1px solid var(--border)" }}
            >
              {greetings.length} {greetings.length === 1 ? "entry" : "entries"}
            </span>
          </div>

          <div
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid var(--border)" }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--surface)" }}>
                  <th
                    className="text-left px-5 py-3 text-xs tracking-wider uppercase"
                    style={{ color: "var(--sage)", borderBottom: "1px solid var(--border)" }}
                  >
                    Name
                  </th>
                  <th
                    className="text-left px-5 py-3 text-xs tracking-wider uppercase hidden sm:table-cell"
                    style={{ color: "var(--sage)", borderBottom: "1px solid var(--border)" }}
                  >
                    Date / Time
                  </th>
                  <th
                    className="text-left px-5 py-3 text-xs tracking-wider uppercase hidden md:table-cell"
                    style={{ color: "var(--sage)", borderBottom: "1px solid var(--border)" }}
                  >
                    Location
                  </th>
                  <th
                    className="text-right px-5 py-3 text-xs tracking-wider uppercase"
                    style={{ color: "var(--sage)", borderBottom: "1px solid var(--border)" }}
                  >
                    IP
                  </th>
                </tr>
              </thead>
              <tbody>
                {greetings.map((g, i) => {
                  const avatar = getAvatarColors(g.name);
                  return (
                    <tr
                      key={i}
                      className="animate-slide-in transition-colors duration-150"
                      style={{
                        animationDelay: `${i * 0.05}s`,
                        borderBottom: i < greetings.length - 1 ? "1px solid var(--border)" : "none",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0"
                            style={{ background: avatar.bg, color: avatar.fg }}
                          >
                            {g.name.charAt(0).toUpperCase()}
                          </span>
                          <span
                            className="font-medium truncate"
                            style={{ color: "var(--foreground)", fontFamily: "var(--font-geist-sans)" }}
                          >
                            {g.name}
                          </span>
                        </div>
                      </td>
                      <td
                        className="px-5 py-3.5 hidden sm:table-cell"
                        style={{ color: "var(--sage)" }}
                      >
                        {formatDate(g.createdAt)}
                      </td>
                      <td
                        className="px-5 py-3.5 hidden md:table-cell text-xs"
                        style={{ color: "var(--sage)", fontFamily: "var(--font-geist-sans)" }}
                      >
                        {g.location || "—"}
                      </td>
                      <td
                        className="px-5 py-3.5 text-right text-xs"
                        style={{ color: "var(--sage)", fontFamily: "var(--font-geist-mono)" }}
                      >
                        {g.ipAddress}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
