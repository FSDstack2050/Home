"use client";

import { useState, useRef } from "react";

interface MediaUploadProps {
  onUpload: (urls: { photoUrl?: string; videoUrl?: string; voiceNoteUrl?: string }) => void;
}

export default function MediaUpload({ onUpload }: MediaUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string>();
  const [videoUrl, setVideoUrl] = useState<string>();
  const [voiceNoteUrl, setVoiceNoteUrl] = useState<string>();
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const uploadFile = async (file: File, type: string) => {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      return data.url;
    } catch {
      alert("Upload failed, please try again.");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFile(file, "photo");
    if (url) {
      setPhotoUrl(url);
      onUpload({ photoUrl: url, videoUrl, voiceNoteUrl });
    }
  };

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFile(file, "video");
    if (url) {
      setVideoUrl(url);
      onUpload({ photoUrl, videoUrl: url, voiceNoteUrl });
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], "voice-note.webm", { type: "audio/webm" });
        const url = await uploadFile(file, "voice");
        if (url) {
          setVoiceNoteUrl(url);
          onUpload({ photoUrl, videoUrl, voiceNoteUrl: url });
        }
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setIsRecording(true);
    } catch {
      alert("Microphone access denied. Please enable it in your browser settings.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const removeMedia = (type: "photo" | "video" | "voice") => {
    if (type === "photo") { setPhotoUrl(undefined); onUpload({ videoUrl, voiceNoteUrl }); }
    if (type === "video") { setVideoUrl(undefined); onUpload({ photoUrl, voiceNoteUrl }); }
    if (type === "voice") { setVoiceNoteUrl(undefined); onUpload({ photoUrl, videoUrl }); }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-gray-700">Attach media (optional)</label>

      {/* Upload buttons */}
      <div className="flex gap-2">
        <label className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${photoUrl ? "border-green-300 bg-green-50" : "border-gray-300 hover:border-purple-300"}`}>
          <span className="text-lg">📷</span>
          <span className="text-xs font-medium text-gray-600">Photo</span>
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} />
        </label>

        <label className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${videoUrl ? "border-green-300 bg-green-50" : "border-gray-300 hover:border-purple-300"}`}>
          <span className="text-lg">🎬</span>
          <span className="text-xs font-medium text-gray-600">Video</span>
          <input type="file" accept="video/*" capture="environment" className="hidden" onChange={handleVideoChange} />
        </label>

        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border-2 border-dashed transition-colors ${
            isRecording
              ? "border-red-400 bg-red-50 animate-pulse"
              : voiceNoteUrl
              ? "border-green-300 bg-green-50"
              : "border-gray-300 hover:border-purple-300"
          }`}
        >
          <span className="text-lg">{isRecording ? "⏹️" : "🎙️"}</span>
          <span className="text-xs font-medium text-gray-600">
            {isRecording ? "Stop" : "Voice"}
          </span>
        </button>
      </div>

      {uploading && (
        <div className="text-center text-xs text-purple-500 animate-pulse">Uploading...</div>
      )}

      {/* Previews */}
      <div className="flex gap-2 flex-wrap">
        {photoUrl && (
          <div className="relative">
            <img src={photoUrl} alt="Upload" className="w-20 h-20 object-cover rounded-xl" />
            <button onClick={() => removeMedia("photo")} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">x</button>
          </div>
        )}
        {videoUrl && (
          <div className="relative">
            <video src={videoUrl} className="w-20 h-20 object-cover rounded-xl" />
            <button onClick={() => removeMedia("video")} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">x</button>
          </div>
        )}
        {voiceNoteUrl && (
          <div className="relative bg-purple-50 rounded-xl p-2 flex items-center gap-1">
            <span>🎙️</span>
            <audio src={voiceNoteUrl} controls className="h-8 w-32" />
            <button onClick={() => removeMedia("voice")} className="w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center ml-1">x</button>
          </div>
        )}
      </div>
    </div>
  );
}
