"use client";

import { useState } from "react";
import { EMOTIONS, QUADRANT_INFO, type Quadrant, type Emotion } from "@/lib/emotions";

interface EmotionPickerProps {
  onSelect: (emotion: Emotion) => void;
  selected?: string;
}

export default function EmotionPicker({ onSelect, selected }: EmotionPickerProps) {
  const [activeQuadrant, setActiveQuadrant] = useState<Quadrant | null>(null);
  const [search, setSearch] = useState("");

  const quadrants: Quadrant[] = [
    "high-energy-pleasant",
    "high-energy-unpleasant",
    "low-energy-pleasant",
    "low-energy-unpleasant",
  ];

  const filteredEmotions = search
    ? EMOTIONS.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
    : activeQuadrant
    ? EMOTIONS.filter((e) => e.quadrant === activeQuadrant)
    : [];

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-gray-700">How are you feeling?</label>

      {/* Search */}
      <input
        type="text"
        placeholder="Search 150 emotions..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          if (e.target.value) setActiveQuadrant(null);
        }}
        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
      />

      {/* Quadrant selector */}
      {!search && (
        <div className="grid grid-cols-2 gap-2">
          {quadrants.map((q) => {
            const info = QUADRANT_INFO[q];
            return (
              <button
                key={q}
                type="button"
                onClick={() => setActiveQuadrant(activeQuadrant === q ? null : q)}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  activeQuadrant === q
                    ? `${info.bg} border-current ${info.color} shadow-md scale-[1.02]`
                    : "bg-white border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="text-lg">{info.icon}</div>
                <div className={`text-xs font-bold mt-1 ${activeQuadrant === q ? info.color : "text-gray-600"}`}>
                  {info.label}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">{info.description}</div>
              </button>
            );
          })}
        </div>
      )}

      {/* Emotion grid */}
      {(activeQuadrant || search) && filteredEmotions.length > 0 && (
        <div className="max-h-48 overflow-y-auto">
          <div className="flex flex-wrap gap-1.5">
            {filteredEmotions.map((emotion) => {
              const info = QUADRANT_INFO[emotion.quadrant];
              return (
                <button
                  key={emotion.name}
                  type="button"
                  onClick={() => onSelect(emotion)}
                  className={`px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                    selected === emotion.name
                      ? `${info.bg} ${info.color} border shadow-sm scale-105`
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {emotion.emoji} {emotion.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {search && filteredEmotions.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">No emotions matching &ldquo;{search}&rdquo;</p>
      )}

      {/* Selected display */}
      {selected && (
        <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 rounded-xl border border-purple-200">
          <span className="text-lg">{EMOTIONS.find((e) => e.name === selected)?.emoji}</span>
          <span className="font-semibold text-purple-700">{selected}</span>
          <span className="text-xs text-purple-400 ml-auto">
            {QUADRANT_INFO[EMOTIONS.find((e) => e.name === selected)?.quadrant || "high-energy-pleasant"].label}
          </span>
        </div>
      )}
    </div>
  );
}
