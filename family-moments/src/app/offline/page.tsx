"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-6">📡</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-3">
          You&apos;re Offline
        </h1>
        <p className="text-gray-500 mb-8">
          No worries — check your connection and try again. Your family is waiting for you!
        </p>
        <button
          onClick={() => typeof window !== "undefined" && window.location.reload()}
          className="px-6 py-3 bg-purple-500 text-white rounded-full font-medium hover:bg-purple-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
