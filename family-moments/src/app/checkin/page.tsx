"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import EmotionPicker from "@/components/EmotionPicker";
import MediaUpload from "@/components/MediaUpload";
import type { Emotion } from "@/lib/emotions";

interface FamilyMember {
  id: string;
  name: string;
  avatar: string;
  isPet: boolean;
}

export default function CheckInPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [emotion, setEmotion] = useState<Emotion | null>(null);
  const [location, setLocation] = useState("");
  const [withWhom, setWithWhom] = useState<string[]>([]);
  const [customPerson, setCustomPerson] = useState("");
  const [activity, setActivity] = useState("");
  const [mediaUrls, setMediaUrls] = useState<{
    photoUrl?: string;
    videoUrl?: string;
    voiceNoteUrl?: string;
  }>({});
  const [onBehalfOf, setOnBehalfOf] = useState("");
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    fetch("/api/family")
      .then((r) => r.json())
      .then((d) => setMembers(d.members || []))
      .catch(() => {});
  }, []);

  const toggleWith = (name: string) => {
    setWithWhom((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const addCustomPerson = () => {
    if (customPerson.trim() && !withWhom.includes(customPerson.trim())) {
      setWithWhom((prev) => [...prev, customPerson.trim()]);
      setCustomPerson("");
    }
  };

  const petMembers = members.filter((m) => m.isPet);
  const humanMembers = members.filter((m) => !m.isPet);
  const currentUserId = (session?.user as any)?.userId;

  const handleSubmit = async () => {
    if (!emotion || !activity.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emotion: emotion.name,
          quadrant: emotion.quadrant,
          emoji: emotion.emoji,
          location,
          withWhom,
          activity,
          ...mediaUrls,
          onBehalfOf: onBehalfOf || undefined,
        }),
      });
      if (res.ok) {
        setSubmitted(true);
        setTimeout(() => router.push("/dashboard"), 1500);
      }
    } catch {
      alert("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-amber-50 flex items-center justify-center">
        <div className="text-2xl animate-pulse">Loading...</div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-amber-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="text-6xl animate-bounce">🎉</div>
          <h2 className="text-2xl font-bold text-gray-800">Moment shared!</h2>
          <p className="text-gray-500">Your family can see it now</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-amber-50">
      <div className="max-w-lg mx-auto p-4 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between py-4">
          <button onClick={() => router.push("/dashboard")} className="text-sm text-purple-600 font-medium">
            &larr; Back
          </button>
          <h1 className="text-lg font-black text-gray-800">Daily Check-in</h1>
          <div className="w-12" />
        </div>

        <div className="space-y-5">
          {/* Check in on behalf of pet */}
          {petMembers.length > 0 && (
            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
              <label className="block text-sm font-semibold text-amber-800 mb-2">
                Checking in for...
              </label>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setOnBehalfOf("")}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    !onBehalfOf ? "bg-amber-300 text-amber-900" : "bg-white text-gray-600"
                  }`}
                >
                  {(session?.user as any)?.avatar} Myself
                </button>
                {petMembers.map((pet) => (
                  <button
                    key={pet.id}
                    onClick={() => setOnBehalfOf(pet.id)}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      onBehalfOf === pet.id ? "bg-amber-300 text-amber-900" : "bg-white text-gray-600"
                    }`}
                  >
                    {pet.avatar} {pet.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Emotion picker */}
          <div className="bg-white/80 backdrop-blur rounded-2xl p-4 shadow-sm">
            <EmotionPicker onSelect={setEmotion} selected={emotion?.name} />
          </div>

          {/* Activity */}
          <div className="bg-white/80 backdrop-blur rounded-2xl p-4 shadow-sm">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              What&apos;s happening? *
            </label>
            <textarea
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              placeholder="Tell your family what you're up to..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
            />
          </div>

          {/* Location */}
          <div className="bg-white/80 backdrop-blur rounded-2xl p-4 shadow-sm">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Where are you? 📍
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Home, Boston University, Coffee Shop..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {/* With whom */}
          <div className="bg-white/80 backdrop-blur rounded-2xl p-4 shadow-sm">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Who are you with? 👥
            </label>
            <div className="flex gap-2 flex-wrap mb-2">
              {humanMembers
                .filter((m) => m.id !== currentUserId)
                .map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleWith(m.name)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      withWhom.includes(m.name)
                        ? "bg-purple-500 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {m.avatar} {m.name}
                  </button>
                ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={customPerson}
                onChange={(e) => setCustomPerson(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomPerson())}
                placeholder="Add someone else..."
                className="flex-1 px-3 py-1.5 border border-gray-200 rounded-full text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"
              />
              <button
                type="button"
                onClick={addCustomPerson}
                className="px-3 py-1.5 bg-gray-100 rounded-full text-xs font-medium hover:bg-gray-200"
              >
                + Add
              </button>
            </div>
            {withWhom.length > 0 && (
              <div className="flex gap-1 flex-wrap mt-2">
                {withWhom.map((name) => (
                  <span
                    key={name}
                    className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs flex items-center gap-1"
                  >
                    {name}
                    <button onClick={() => toggleWith(name)} className="text-purple-400 hover:text-purple-600">
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Media upload */}
          <div className="bg-white/80 backdrop-blur rounded-2xl p-4 shadow-sm">
            <MediaUpload onUpload={setMediaUrls} />
          </div>
        </div>

        {/* Submit button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white/90 to-transparent">
          <div className="max-w-lg mx-auto">
            <button
              onClick={handleSubmit}
              disabled={!emotion || !activity.trim() || submitting}
              className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-2xl text-lg shadow-lg disabled:opacity-30 transition-opacity"
            >
              {submitting ? "Sharing..." : "Share This Moment 💜"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
