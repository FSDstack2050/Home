"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CheckInCard from "@/components/CheckInCard";

interface FamilyMember {
  id: string;
  name: string;
  avatar: string;
  isPet: boolean;
}

interface CheckInData {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userIsPet: boolean;
  emotion: string;
  quadrant: string;
  emoji: string;
  location: string;
  withWhom: string[];
  activity: string;
  photoUrl?: string;
  videoUrl?: string;
  voiceNoteUrl?: string;
  createdAt: string;
  reactions: { id: string; userId: string; emoji: string }[];
  comments: { id: string; userId: string; text: string; createdAt: string }[];
}

interface FamilyData {
  family: { id: string; name: string; inviteCode: string };
  members: FamilyMember[];
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [familyData, setFamilyData] = useState<FamilyData | null>(null);
  const [checkins, setCheckins] = useState<CheckInData[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const loadData = useCallback(async () => {
    try {
      const [familyRes, checkinsRes] = await Promise.all([
        fetch("/api/family"),
        fetch(`/api/checkins?date=${selectedDate}`),
      ]);
      const familyJson = await familyRes.json();
      const checkinsJson = await checkinsRes.json();
      setFamilyData(familyJson);
      setCheckins(checkinsJson.checkins || []);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (status === "authenticated") loadData();
  }, [status, loadData]);

  const handleReact = async (checkinId: string, emoji: string) => {
    await fetch("/api/reactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkinId, type: "reaction", emoji }),
    });
    loadData();
  };

  const handleComment = async (checkinId: string, text: string) => {
    await fetch("/api/reactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkinId, type: "comment", text }),
    });
    loadData();
  };

  const currentUserId = (session?.user as any)?.userId || "";
  const today = new Date().toISOString().slice(0, 10);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-amber-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-4xl animate-bounce">🏠</div>
          <p className="text-gray-500 animate-pulse">Loading your family...</p>
        </div>
      </div>
    );
  }

  const members = familyData?.members || [];
  const checkedInUserIds = new Set(checkins.map((c) => c.userId));

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-amber-50">
      <div className="max-w-lg mx-auto p-4 pb-32">
        {/* Header */}
        <div className="flex items-center justify-between py-4">
          <div>
            <h1 className="text-xl font-black text-gray-800">
              {familyData?.family?.name || "Family"}
            </h1>
            <p className="text-xs text-gray-500">
              {selectedDate === today ? "Today" : selectedDate}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInvite(!showInvite)}
              className="text-xs px-3 py-1.5 bg-white/70 rounded-full text-gray-600 hover:bg-white"
              title="Invite code"
            >
              🔗
            </button>
            <Link
              href="/recap"
              className="text-xs px-3 py-1.5 bg-white/70 rounded-full text-gray-600 hover:bg-white"
            >
              📊 Recap
            </Link>
            <Link
              href="/profile"
              className="text-xs px-3 py-1.5 bg-white/70 rounded-full text-gray-600 hover:bg-white"
            >
              ⚙️
            </Link>
          </div>
        </div>

        {/* Invite code banner */}
        {showInvite && (
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 mb-4 text-center">
            <p className="text-xs text-purple-600 mb-1">Family Invite Code</p>
            <p className="text-xl font-mono font-black text-purple-700 tracking-widest">
              {familyData?.family?.inviteCode}
            </p>
            <p className="text-[10px] text-purple-400 mt-1">Share this with family members to join</p>
          </div>
        )}

        {/* Date picker */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().slice(0, 10);
            const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
            const dayNum = d.getDate();
            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`flex-shrink-0 w-14 py-2 rounded-xl text-center transition-all ${
                  selectedDate === dateStr
                    ? "bg-purple-500 text-white shadow-md"
                    : "bg-white/60 text-gray-600 hover:bg-white"
                }`}
              >
                <div className="text-[10px] font-medium">{i === 0 ? "Today" : dayName}</div>
                <div className="text-lg font-bold">{dayNum}</div>
              </button>
            );
          })}
        </div>

        {/* Family members status bar */}
        <div className="bg-white/70 backdrop-blur rounded-2xl p-4 mb-4">
          <div className="text-xs font-semibold text-gray-500 mb-2">Family Status</div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {members.map((m) => {
              const hasCheckedIn = checkedInUserIds.has(m.id);
              const memberCheckin = checkins.find((c) => c.userId === m.id);
              return (
                <div key={m.id} className="flex-shrink-0 text-center">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl border-2 ${
                      hasCheckedIn
                        ? "border-green-400 bg-green-50"
                        : "border-gray-200 bg-gray-50 opacity-50"
                    }`}
                  >
                    {m.avatar}
                  </div>
                  <div className="text-[10px] font-medium text-gray-600 mt-1 truncate w-14">
                    {m.name}
                  </div>
                  {hasCheckedIn && memberCheckin && (
                    <div className="text-sm mt-0.5">{memberCheckin.emoji}</div>
                  )}
                  {!hasCheckedIn && (
                    <div className="text-[10px] text-gray-400 mt-0.5">---</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Check-ins feed */}
        {checkins.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-500 font-medium">No check-ins yet today</p>
            <p className="text-xs text-gray-400 mt-1">Be the first to share a moment!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {checkins.map((checkin) => (
              <CheckInCard
                key={checkin.id}
                checkin={checkin}
                currentUserId={currentUserId}
                familyMembers={members}
                onReact={handleReact}
                onComment={handleComment}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating check-in button */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center z-20">
        <Link
          href="/checkin"
          className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-2xl text-lg shadow-2xl shadow-purple-300/50 hover:shadow-purple-400/60 transition-all hover:scale-105 active:scale-95"
        >
          + Check In
        </Link>
      </div>
    </div>
  );
}
