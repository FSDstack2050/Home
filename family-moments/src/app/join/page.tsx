"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const AVATARS = ["👨", "👩", "👦", "🧑", "👧", "👴", "👵", "🧔", "👩‍🦰", "🧑‍🦱", "👱", "🤶"];

export default function JoinPage() {
  const [inviteCode, setInviteCode] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState("👤");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/family", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "join",
          inviteCode,
          name,
          email,
          password,
          avatar,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to join");

      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setError("Joined but login failed. Try logging in.");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">👨‍👩‍👧‍👦</div>
          <h1 className="text-2xl font-black text-gray-800">Join Your Family</h1>
          <p className="text-sm text-gray-500 mt-1">Enter the invite code shared with you</p>
        </div>

        <form onSubmit={handleJoin} className="bg-white/80 backdrop-blur rounded-3xl shadow-xl p-6 space-y-4">
          {error && <div className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2 text-center">{error}</div>}

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Family Invite Code</label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="e.g. A1B2C3D4"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm text-center font-mono tracking-widest text-lg"
            />
          </div>

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

          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm" />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email" required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password" required minLength={6} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm" />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl disabled:opacity-50"
          >
            {loading ? "Joining..." : "Join Family"}
          </button>
        </form>

        <div className="text-center mt-4 space-y-2">
          <Link href="/login" className="text-sm text-gray-500 hover:underline block">Already have an account? Sign in</Link>
          <Link href="/register" className="text-sm text-purple-600 font-medium hover:underline block">Create a new family instead</Link>
        </div>
      </div>
    </div>
  );
}
