"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setStatus("loading");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to reset password");
        setStatus("idle");
        return;
      }

      setStatus("success");
    } catch {
      setError("Something went wrong. Please try again.");
      setStatus("idle");
    }
  }

  if (!token) {
    return (
      <div className="bg-white/80 backdrop-blur rounded-3xl p-6 shadow-lg text-center space-y-4">
        <div className="text-4xl">&#x26A0;&#xFE0F;</div>
        <h2 className="text-lg font-bold text-gray-800">Invalid Reset Link</h2>
        <p className="text-gray-500 text-sm">
          This link is missing a reset token. Please request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="block w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl text-sm text-center shadow hover:shadow-lg transition-all"
        >
          Request New Link
        </Link>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="bg-white/80 backdrop-blur rounded-3xl p-6 shadow-lg text-center space-y-4">
        <div className="text-4xl">&#x2705;</div>
        <h2 className="text-lg font-bold text-gray-800">Password Reset!</h2>
        <p className="text-gray-500 text-sm">
          Your password has been updated. You can now sign in with your new password.
        </p>
        <Link
          href="/login"
          className="block w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl text-lg text-center shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white/80 backdrop-blur rounded-3xl p-6 shadow-lg space-y-4">
      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3 text-center">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1">
          New Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          placeholder="At least 6 characters"
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-400 focus:outline-none transition-colors text-gray-800"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1">
          Confirm Password
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          placeholder="Type it again"
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-400 focus:outline-none transition-colors text-gray-800"
        />
      </div>

      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100"
      >
        {status === "loading" ? "Resetting..." : "Reset Password"}
      </button>

      <Link
        href="/login"
        className="block text-center text-sm text-gray-500 hover:underline"
      >
        Back to Sign In
      </Link>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">&#x1F510;</div>
          <h1 className="text-3xl font-black text-gray-800 mb-1">
            New Password
          </h1>
          <p className="text-gray-500 text-sm">
            Choose a strong new password for your account
          </p>
        </div>

        <Suspense fallback={
          <div className="bg-white/80 backdrop-blur rounded-3xl p-6 shadow-lg text-center">
            <p className="text-gray-500">Loading...</p>
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
