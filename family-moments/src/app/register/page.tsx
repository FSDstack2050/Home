"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const AVATARS = ["👨", "👩", "👦", "🧑", "👧", "👴", "👵", "🧔", "👩‍🦰", "🧑‍🦱", "👱", "🤶"];

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [familyName, setFamilyName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState("👨");
  const [error, setError] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/family", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          familyName,
          name,
          email,
          password,
          avatar,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setInviteCode(data.family.inviteCode);
      setStep(3);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      setError("Account created but login failed. Try logging in manually.");
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🏠</div>
          <h1 className="text-2xl font-black text-gray-800">Create Your Family</h1>
        </div>

        {step === 1 && (
          <div className="bg-white/80 backdrop-blur rounded-3xl shadow-xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-center">Step 1: Family Name</h2>
            <input
              type="text"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder="e.g. The Johnsons"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
            />
            <button
              onClick={() => familyName.trim() && setStep(2)}
              disabled={!familyName.trim()}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl disabled:opacity-30"
            >
              Next
            </button>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleCreate} className="bg-white/80 backdrop-blur rounded-3xl shadow-xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-center">Step 2: Your Profile</h2>

            {error && <div className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2 text-center">{error}</div>}

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2">Pick your avatar</label>
              <div className="flex flex-wrap gap-2 justify-center">
                {AVATARS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAvatar(a)}
                    className={`text-3xl p-1 rounded-xl transition-all ${avatar === a ? "bg-purple-100 scale-110 ring-2 ring-purple-400" : "hover:bg-gray-100"}`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
            />

            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(1)} className="px-4 py-3 text-gray-500 font-medium rounded-xl border border-gray-200">
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Family"}
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <div className="bg-white/80 backdrop-blur rounded-3xl shadow-xl p-6 space-y-4 text-center">
            <div className="text-5xl">🎉</div>
            <h2 className="text-lg font-bold">Family created!</h2>
            <p className="text-sm text-gray-600">
              Share this invite code with your family members so they can join:
            </p>
            <div className="bg-purple-50 border-2 border-purple-300 rounded-xl px-4 py-3">
              <span className="text-2xl font-mono font-black text-purple-700 tracking-widest">{inviteCode}</span>
            </div>
            <p className="text-xs text-gray-400">They can use this at the &ldquo;Join Family&rdquo; page</p>
            <button
              onClick={handleLogin}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl"
            >
              Go to Dashboard
            </button>
          </div>
        )}

        <div className="text-center mt-4">
          <Link href="/login" className="text-sm text-gray-500 hover:underline">Already have an account? Sign in</Link>
        </div>
      </div>
    </div>
  );
}
