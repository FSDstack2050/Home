"use client";

import { useState, useEffect, useCallback } from "react";

function scheduleReminder() {
  const today = new Date().toISOString().slice(0, 10);
  const lastReminder = localStorage.getItem("last-reminder-date");

  if (lastReminder === today) return;

  const checkReminder = () => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    if (now.getHours() >= 19) {
      const lastCheckin = localStorage.getItem("last-checkin-date");
      if (lastCheckin !== todayStr) {
        new Notification("Our Day", {
          body: "You haven't checked in today! Share how your day is going with your family.",
          icon: "/icon-192.png",
        });
        localStorage.setItem("last-reminder-date", todayStr);
      }
    }
  };

  // Check every 30 minutes
  const interval = setInterval(checkReminder, 30 * 60 * 1000);
  checkReminder();

  return () => clearInterval(interval);
}

export default function NotificationBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    const perm = Notification.permission;

    // Show banner if notifications are not yet granted and user hasn't dismissed
    const dismissed = localStorage.getItem("notification-banner-dismissed");
    if (perm === "default" && !dismissed) {
      setShowBanner(true);
    }

    // If already granted, set up daily check reminder
    if (perm === "granted") {
      const cleanup = scheduleReminder();
      return cleanup;
    }
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      const result = await Notification.requestPermission();
      if (result === "granted") {
        setShowBanner(false);
        scheduleReminder();
        new Notification("Our Day", {
          body: "Daily reminders are on! We'll nudge you if you forget to check in.",
          icon: "/icon-192.png",
        });
      } else {
        setShowBanner(false);
        localStorage.setItem("notification-banner-dismissed", "true");
      }
    } catch {
      setShowBanner(false);
    }
  }, []);

  const dismiss = useCallback(() => {
    setShowBanner(false);
    localStorage.setItem("notification-banner-dismissed", "true");
  }, []);

  if (!showBanner) return null;

  return (
    <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-4 mb-4 text-white animate-slideDown">
      <div className="flex items-start gap-3">
        <div className="text-2xl flex-shrink-0 mt-0.5">&#x1F514;</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold">Enable daily reminders?</div>
          <div className="text-xs opacity-90 mt-0.5">
            Get a gentle nudge each evening if you haven&apos;t checked in yet.
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={requestPermission}
              className="px-4 py-1.5 bg-white text-purple-600 rounded-full text-xs font-bold hover:bg-purple-50 transition-colors"
            >
              Enable
            </button>
            <button
              onClick={dismiss}
              className="px-4 py-1.5 bg-white/20 text-white rounded-full text-xs font-medium hover:bg-white/30 transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
