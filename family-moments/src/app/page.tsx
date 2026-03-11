"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

export default function HomePage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.push("/dashboard");
  }, [status, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        {/* Hero */}
        <div className="mb-12">
          <div className="text-7xl mb-4 animate-float">&#x1F31E;</div>
          <h1 className="text-5xl font-black text-gray-800 mb-2 tracking-tight">
            Our Day
          </h1>
          <p className="text-gray-500 text-sm max-w-xs mx-auto leading-relaxed">
            Share daily check-ins, emotions, and moments with your family &mdash; no matter where you are.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="bg-white/60 backdrop-blur rounded-2xl p-4 hover:bg-white/80 transition-colors">
            <div className="text-2xl mb-1">&#x1F60A;</div>
            <div className="text-xs font-bold text-gray-700">150 Emotions</div>
            <div className="text-[10px] text-gray-400">4 mood quadrants</div>
          </div>
          <div className="bg-white/60 backdrop-blur rounded-2xl p-4 hover:bg-white/80 transition-colors">
            <div className="text-2xl mb-1">&#x1F4F7;</div>
            <div className="text-xs font-bold text-gray-700">Photos & Video</div>
            <div className="text-[10px] text-gray-400">Share visual moments</div>
          </div>
          <div className="bg-white/60 backdrop-blur rounded-2xl p-4 hover:bg-white/80 transition-colors">
            <div className="text-2xl mb-1">&#x1F399;&#xFE0F;</div>
            <div className="text-xs font-bold text-gray-700">Voice Notes</div>
            <div className="text-[10px] text-gray-400">Hear each other</div>
          </div>
          <div className="bg-white/60 backdrop-blur rounded-2xl p-4 hover:bg-white/80 transition-colors">
            <div className="text-2xl mb-1">&#x1F525;</div>
            <div className="text-xs font-bold text-gray-700">Family Streaks</div>
            <div className="text-[10px] text-gray-400">Stay connected daily</div>
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <Link
            href="/register"
            className="block w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-2xl text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
          >
            Create Your Family
          </Link>
          <Link
            href="/join"
            className="block w-full py-4 bg-white/80 text-purple-600 font-bold rounded-2xl text-lg border-2 border-purple-200 hover:border-purple-300 hover:bg-white transition-all"
          >
            Join a Family
          </Link>
          <Link
            href="/login"
            className="block text-sm text-gray-500 hover:underline mt-2"
          >
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
