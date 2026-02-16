"use client";

import { useState } from "react";
import { QUADRANT_INFO, type Quadrant } from "@/lib/emotions";
import { formatDistanceToNow } from "date-fns";

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

interface CheckInCardProps {
  checkin: CheckInData;
  currentUserId: string;
  familyMembers: { id: string; name: string; avatar: string }[];
  onReact: (checkinId: string, emoji: string) => void;
  onComment: (checkinId: string, text: string) => void;
}

const REACTION_OPTIONS = ["❤️", "😂", "🔥", "👏", "🥺", "💪"];

export default function CheckInCard({
  checkin,
  currentUserId,
  familyMembers,
  onReact,
  onComment,
}: CheckInCardProps) {
  const [showReactions, setShowReactions] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(false);

  const quadrantInfo = QUADRANT_INFO[checkin.quadrant as Quadrant];
  const timeAgo = formatDistanceToNow(new Date(checkin.createdAt), { addSuffix: true });

  const getMemberName = (id: string) => {
    const member = familyMembers.find((m) => m.id === id);
    return member?.name || "Someone";
  };

  const handleComment = () => {
    if (commentText.trim()) {
      onComment(checkin.id, commentText.trim());
      setCommentText("");
    }
  };

  return (
    <div className={`rounded-2xl border-2 overflow-hidden transition-all hover:shadow-lg ${quadrantInfo?.bg || "bg-white border-gray-200"}`}>
      {/* Header */}
      <div className="p-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{checkin.userAvatar}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-800">{checkin.userName}</span>
              {checkin.userIsPet && (
                <span className="text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full font-bold">
                  PET
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500">{timeAgo}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl">{checkin.emoji}</div>
            <div className={`text-xs font-bold ${quadrantInfo?.color || "text-gray-600"}`}>{checkin.emotion}</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-3 space-y-2">
        {/* Activity */}
        <p className="text-sm text-gray-700 font-medium">{checkin.activity}</p>

        {/* Location & With */}
        <div className="flex flex-wrap gap-2 text-xs">
          {checkin.location && (
            <span className="bg-white/60 backdrop-blur px-2 py-1 rounded-full text-gray-600">
              📍 {checkin.location}
            </span>
          )}
          {checkin.withWhom.length > 0 && (
            <span className="bg-white/60 backdrop-blur px-2 py-1 rounded-full text-gray-600">
              👥 {checkin.withWhom.join(", ")}
            </span>
          )}
        </div>

        {/* Media */}
        {checkin.photoUrl && (
          <div className="rounded-xl overflow-hidden">
            <img src={checkin.photoUrl} alt="Check-in photo" className="w-full h-48 object-cover" />
          </div>
        )}
        {checkin.videoUrl && (
          <video src={checkin.videoUrl} controls className="w-full rounded-xl h-48 object-cover" />
        )}
        {checkin.voiceNoteUrl && (
          <div className="bg-white/60 backdrop-blur rounded-xl p-2">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">🎙️ Voice Note</div>
            <audio src={checkin.voiceNoteUrl} controls className="w-full h-8" />
          </div>
        )}
      </div>

      {/* Reactions display */}
      {checkin.reactions.length > 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1">
          {checkin.reactions.map((r) => (
            <span
              key={r.id}
              className="bg-white/70 px-2 py-0.5 rounded-full text-sm"
              title={getMemberName(r.userId)}
            >
              {r.emoji}
            </span>
          ))}
        </div>
      )}

      {/* Action bar */}
      <div className="px-4 py-2 border-t border-black/5 flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setShowReactions(!showReactions)}
            className="text-xs px-3 py-1.5 rounded-full bg-white/60 hover:bg-white/80 text-gray-600 transition-colors"
          >
            ❤️ React
          </button>
          {showReactions && (
            <div className="absolute bottom-full left-0 mb-1 flex gap-1 bg-white rounded-full shadow-lg p-1.5 z-10">
              {REACTION_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onReact(checkin.id, emoji);
                    setShowReactions(false);
                  }}
                  className="text-lg hover:scale-125 transition-transform px-0.5"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => setShowComments(!showComments)}
          className="text-xs px-3 py-1.5 rounded-full bg-white/60 hover:bg-white/80 text-gray-600 transition-colors"
        >
          💬 {checkin.comments.length || "Comment"}
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="px-4 pb-3 space-y-2">
          {checkin.comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2 text-xs">
              <span className="font-bold text-gray-700">{getMemberName(c.userId)}</span>
              <span className="text-gray-600">{c.text}</span>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleComment()}
              placeholder="Write a comment..."
              className="flex-1 text-xs px-3 py-1.5 border border-gray-200 rounded-full focus:outline-none focus:ring-1 focus:ring-purple-400"
            />
            <button
              onClick={handleComment}
              disabled={!commentText.trim()}
              className="text-xs px-3 py-1.5 bg-purple-500 text-white rounded-full disabled:opacity-30"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
