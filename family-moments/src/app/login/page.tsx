"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError("Invalid email or password");
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🏠</div>
          <h1 className="text-3xl font-black text-gray-800">Family Moments</h1>
          <p className="text-sm text-gray-500 mt-1">Stay close, even when apart</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/80 backdrop-blur rounded-3xl shadow-xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-800 text-center">Welcome back!</h2>

          {error && (
            <div className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2 text-center">{error}</div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
              placeholder="you@email.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
              placeholder="Your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

          {/* Demo login */}
          <div className="text-center text-xs text-gray-400 pt-2">
            <p className="mb-2">Try the demo:</p>
            <button
              type="button"
              onClick={() => {
                setEmail("dad@family.com");
                setPassword("password123");
              }}
              className="text-purple-500 underline"
            >
              Use demo account
            </button>
          </div>
        </form>

        <div className="text-center mt-4 space-y-2">
          <Link href="/register" className="text-sm text-purple-600 font-medium hover:underline block">
            Create a new family
          </Link>
          <Link href="/join" className="text-sm text-gray-500 hover:underline block">
            Join an existing family
          </Link>
        </div>
      </div>
    </div>
  );
}
