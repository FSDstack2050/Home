"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QUADRANT_INFO, type Quadrant } from "@/lib/emotions";

interface RecapData {
  totalCheckins: number;
  totalMembers: number;
  quadrantCounts: Record<string, number>;
  topEmotion: { name: string; count: number; emoji: string };
  mostActive: { user: { name: string; avatar: string } | null; count: number };
  memberStats: {
    user: { id: string; name: string; avatar: string; isPet: boolean };
    stats: { checkins: number; topEmotion: string; topEmoji: string };
  }[];
  media: { photos: number; voiceNotes: number; videos: number };
  period: { from: string; to: string };
  daysActive: number;
  totalReactions: number;
  totalComments: number;
  familyStreak: number;
  memberStreaks: { userId: string; name: string; avatar: string; streak: number }[];
}

export default function RecapPage() {
  const { status } = useSession();
  const router = useRouter();
  const [recap, setRecap] = useState<RecapData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    fetch("/api/recap")
      .then((r) => r.json())
      .then((d) => setRecap(d.recap))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-amber-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-4xl animate-spin-slow">&#x1F4CA;</div>
          <div className="animate-pulse text-gray-500">Crunching the numbers...</div>
        </div>
      </div>
    );
  }

  if (!recap) return null;

  const totalQuadrant = Object.values(recap.quadrantCounts).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-amber-50">
      <div className="max-w-lg mx-auto p-4 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between py-4">
          <Link href="/dashboard" className="text-sm text-purple-600 font-medium">
            &larr; Back
          </Link>
          <h1 className="text-lg font-black text-gray-800">Weekly Recap</h1>
          <div className="w-12" />
        </div>

        <p className="text-xs text-gray-500 text-center mb-6">
          {recap.period.from} to {recap.period.to}
        </p>

        {/* Family streak banner */}
        {recap.familyStreak > 0 && (
          <div className="bg-gradient-to-r from-orange-400 via-red-400 to-pink-400 rounded-2xl p-5 mb-4 text-center text-white shadow-lg">
            <div className="text-4xl mb-2">&#x1F525;</div>
            <div className="text-3xl font-black">{recap.familyStreak} Day Streak!</div>
            <div className="text-sm opacity-90 mt-1">
              Everyone checked in {recap.familyStreak} day{recap.familyStreak !== 1 ? "s" : ""} in a row
            </div>
          </div>
        )}

        {/* Overview stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white/80 backdrop-blur rounded-2xl p-4 text-center">
            <div className="text-3xl font-black text-purple-600">{recap.totalCheckins}</div>
            <div className="text-[10px] text-gray-500 font-medium">Check-ins</div>
          </div>
          <div className="bg-white/80 backdrop-blur rounded-2xl p-4 text-center">
            <div className="text-3xl font-black text-pink-600">{recap.daysActive}/7</div>
            <div className="text-[10px] text-gray-500 font-medium">Days Active</div>
          </div>
          <div className="bg-white/80 backdrop-blur rounded-2xl p-4 text-center">
            <div className="text-3xl font-black text-amber-600">{recap.totalReactions + recap.totalComments}</div>
            <div className="text-[10px] text-gray-500 font-medium">Interactions</div>
          </div>
        </div>

        {/* Mood quadrant breakdown */}
        <div className="bg-white/80 backdrop-blur rounded-2xl p-4 mb-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Family Mood This Week</h3>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(recap.quadrantCounts) as [Quadrant, number][]).map(([quadrant, count]) => {
              const info = QUADRANT_INFO[quadrant];
              const pct = Math.round((count / totalQuadrant) * 100);
              return (
                <div key={quadrant} className={`rounded-xl p-3 border ${info?.bg || "bg-gray-50"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">{info?.icon}</span>
                    <span className={`text-lg font-black ${info?.color}`}>{pct}%</span>
                  </div>
                  <div className="w-full bg-black/5 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        quadrant === "high-energy-pleasant" ? "bg-amber-400" :
                        quadrant === "high-energy-unpleasant" ? "bg-red-400" :
                        quadrant === "low-energy-pleasant" ? "bg-emerald-400" :
                        "bg-indigo-400"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">{info?.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top emotion */}
        <div className="bg-white/80 backdrop-blur rounded-2xl p-4 mb-4 text-center">
          <div className="text-xs text-gray-500 mb-1">Top Family Emotion</div>
          <div className="text-3xl mb-1">{recap.topEmotion.emoji}</div>
          <div className="text-2xl font-black text-gray-800">{recap.topEmotion.name}</div>
          <div className="text-xs text-gray-400">appeared {recap.topEmotion.count} time(s)</div>
        </div>

        {/* Most active */}
        {recap.mostActive.user && (
          <div className="bg-gradient-to-r from-amber-100 to-amber-50 rounded-2xl p-4 mb-4 flex items-center gap-3">
            <div className="text-4xl">{recap.mostActive.user.avatar}</div>
            <div>
              <div className="text-sm font-bold text-amber-800">Most Active</div>
              <div className="text-xs text-amber-600">
                {recap.mostActive.user.name} with {recap.mostActive.count} check-in(s)
              </div>
            </div>
            <div className="ml-auto text-2xl">&#x1F3C6;</div>
          </div>
        )}

        {/* Member streaks */}
        {recap.memberStreaks.length > 0 && (
          <div className="bg-white/80 backdrop-blur rounded-2xl p-4 mb-4">
            <h3 className="text-sm font-bold text-gray-700 mb-3">&#x1F525; Individual Streaks</h3>
            <div className="space-y-2">
              {recap.memberStreaks
                .sort((a, b) => b.streak - a.streak)
                .map((ms) => (
                  <div key={ms.userId} className="flex items-center gap-3">
                    <div className="text-2xl">{ms.avatar}</div>
                    <div className="flex-1">
                      <span className="text-sm font-bold text-gray-700">{ms.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {ms.streak > 0 ? (
                        <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 rounded-full">
                          <span className="text-xs">&#x1F525;</span>
                          <span className="text-xs font-bold text-orange-700">{ms.streak} day{ms.streak !== 1 ? "s" : ""}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 px-2 py-1">No streak</span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Member breakdown */}
        <div className="bg-white/80 backdrop-blur rounded-2xl p-4 mb-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Member Highlights</h3>
          <div className="space-y-3">
            {recap.memberStats.map(({ user, stats }) => (
              <div key={user.id} className="flex items-center gap-3">
                <div className="text-2xl">{user.avatar}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-700">{user.name}</span>
                    {user.isPet && (
                      <span className="text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full font-bold">
                        PET
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {stats.checkins} check-in(s) &middot; Top: {stats.topEmoji} {stats.topEmotion}
                  </div>
                </div>
                <div className="text-lg">{stats.topEmoji}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Media breakdown */}
        <div className="bg-white/80 backdrop-blur rounded-2xl p-4 mb-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Shared Moments</h3>
          <div className="flex gap-4 justify-center text-center">
            <div>
              <div className="text-2xl">&#x1F4F7;</div>
              <div className="text-lg font-bold">{recap.media.photos}</div>
              <div className="text-[10px] text-gray-500">Photos</div>
            </div>
            <div>
              <div className="text-2xl">&#x1F3AC;</div>
              <div className="text-lg font-bold">{recap.media.videos}</div>
              <div className="text-[10px] text-gray-500">Videos</div>
            </div>
            <div>
              <div className="text-2xl">&#x1F399;&#xFE0F;</div>
              <div className="text-lg font-bold">{recap.media.voiceNotes}</div>
              <div className="text-[10px] text-gray-500">Voice Notes</div>
            </div>
          </div>
        </div>

        {/* Engagement stats */}
        <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Family Engagement</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <div className="text-2xl font-black text-purple-600">{recap.totalReactions}</div>
              <div className="text-[10px] text-gray-500">Reactions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-pink-600">{recap.totalComments}</div>
              <div className="text-[10px] text-gray-500">Comments</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
