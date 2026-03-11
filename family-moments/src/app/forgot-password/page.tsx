"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent">("idle");
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setStatus("loading");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (data.resetToken) {
        setResetLink(`${window.location.origin}/reset-password?token=${data.resetToken}`);
      }
      setStatus("sent");
    } catch {
      setError("Something went wrong. Please try again.");
      setStatus("idle");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">&#x1F512;</div>
          <h1 className="text-3xl font-black text-gray-800 mb-1">
            Forgot Password
          </h1>
          <p className="text-gray-500 text-sm">
            Enter your email and we&apos;ll help you get back in
          </p>
        </div>

        {status === "sent" ? (
          <div className="bg-white/80 backdrop-blur rounded-3xl p-6 shadow-lg space-y-4">
            <div className="text-center">
              <div className="text-4xl mb-3">&#x2709;&#xFE0F;</div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">Check your inbox</h2>
              <p className="text-gray-500 text-sm">
                If an account exists for <strong>{email}</strong>, a reset link has been generated.
              </p>
            </div>

            {resetLink && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <p className="text-xs font-bold text-amber-700 mb-2">
                  Demo Mode &mdash; no email service configured
                </p>
                <p className="text-xs text-amber-600 mb-3">
                  In production, this link would be emailed. For now, click below:
                </p>
                <Link
                  href={resetLink}
                  className="block w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl text-sm text-center shadow hover:shadow-lg hover:scale-[1.02] transition-all"
                >
                  Reset My Password
                </Link>
              </div>
            )}

            <Link
              href="/login"
              className="block text-center text-sm text-purple-600 hover:underline mt-2"
            >
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white/80 backdrop-blur rounded-3xl p-6 shadow-lg space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3 text-center">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@family.com"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-400 focus:outline-none transition-colors text-gray-800"
              />
            </div>

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100"
            >
              {status === "loading" ? "Sending..." : "Send Reset Link"}
            </button>

            <Link
              href="/login"
              className="block text-center text-sm text-gray-500 hover:underline"
            >
              Back to Sign In
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
