"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface FamilyMember {
  id: string;
  name: string;
  avatar: string;
  isPet: boolean;
}

const PET_AVATARS = ["🐕", "🐶", "🐾", "🐈", "🐱", "🐰", "🐹", "🦜", "🐠", "🐢"];

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [familyName, setFamilyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  // Add pet form
  const [showAddPet, setShowAddPet] = useState(false);
  const [petName, setPetName] = useState("");
  const [petAvatar, setPetAvatar] = useState("🐕");
  const [addingPet, setAddingPet] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    fetch("/api/family")
      .then((r) => r.json())
      .then((d) => {
        setMembers(d.members || []);
        setFamilyName(d.family?.name || "");
        setInviteCode(d.family?.inviteCode || "");
      })
      .catch(() => {});
  }, []);

  const handleAddPet = async () => {
    if (!petName.trim()) return;
    setAddingPet(true);
    try {
      const res = await fetch("/api/family", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add-pet",
          name: petName,
          avatar: petAvatar,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMembers((prev) => [...prev, data.user]);
        setPetName("");
        setShowAddPet(false);
      }
    } catch {
      alert("Failed to add pet");
    } finally {
      setAddingPet(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-amber-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  const user = session?.user as any;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-amber-50">
      <div className="max-w-lg mx-auto p-4 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between py-4">
          <Link href="/dashboard" className="text-sm text-purple-600 font-medium">
            &larr; Back
          </Link>
          <h1 className="text-lg font-black text-gray-800">Profile & Settings</h1>
          <div className="w-12" />
        </div>

        {/* User profile */}
        <div className="bg-white/80 backdrop-blur rounded-2xl p-6 mb-4 text-center">
          <div className="text-6xl mb-2">{user?.avatar || "👤"}</div>
          <div className="text-xl font-bold text-gray-800">{user?.name}</div>
          <div className="text-sm text-gray-500">{user?.email}</div>
        </div>

        {/* Family info */}
        <div className="bg-white/80 backdrop-blur rounded-2xl p-4 mb-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Family: {familyName}</h3>
          <div className="bg-purple-50 rounded-xl p-3 text-center mb-3">
            <div className="text-[10px] text-purple-600 mb-1">Invite Code</div>
            <div className="text-xl font-mono font-black text-purple-700 tracking-widest">{inviteCode}</div>
          </div>

          <div className="text-xs font-semibold text-gray-500 mb-2">Members ({members.length})</div>
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2">
                <span className="text-2xl">{m.avatar}</span>
                <span className="text-sm font-medium text-gray-700 flex-1">{m.name}</span>
                {m.isPet && (
                  <span className="text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full font-bold">
                    PET
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Add pet */}
        <div className="bg-white/80 backdrop-blur rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-gray-700">Pet Profiles</h3>
            <button
              onClick={() => setShowAddPet(!showAddPet)}
              className="text-xs px-3 py-1.5 bg-amber-100 text-amber-800 rounded-full font-medium hover:bg-amber-200"
            >
              {showAddPet ? "Cancel" : "+ Add Pet"}
            </button>
          </div>

          {showAddPet && (
            <div className="space-y-3 mt-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2">Pick an avatar</label>
                <div className="flex flex-wrap gap-2 justify-center">
                  {PET_AVATARS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setPetAvatar(a)}
                      className={`text-3xl p-1 rounded-xl transition-all ${petAvatar === a ? "bg-amber-100 scale-110 ring-2 ring-amber-400" : "hover:bg-gray-100"}`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="text"
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
                placeholder="Pet's name"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm"
              />
              <button
                onClick={handleAddPet}
                disabled={!petName.trim() || addingPet}
                className="w-full py-3 bg-gradient-to-r from-amber-400 to-amber-500 text-white font-bold rounded-xl disabled:opacity-30"
              >
                {addingPet ? "Adding..." : "Add Pet to Family"}
              </button>
            </div>
          )}

          {!showAddPet && members.filter((m) => m.isPet).length === 0 && (
            <p className="text-xs text-gray-400 mt-1">No pets yet. Getting a dog soon? Add them here!</p>
          )}
        </div>

        {/* Sign out */}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full py-3 bg-red-50 border border-red-200 text-red-600 font-bold rounded-2xl hover:bg-red-100 transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
