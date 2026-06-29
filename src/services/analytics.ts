import { AnalyticsState, FocusMission } from "../types";
import { todayKey } from "../utils/time";

const achievementRules = [
  { id: "first-session", label: "First Session", test: (a: AnalyticsState) => a.totalCompletedSessions >= 1 },
  { id: "ten-hours", label: "10 Hours", test: (a: AnalyticsState) => totalFocus(a) >= 10 * 3600000 },
  { id: "fifty-hours", label: "50 Hours", test: (a: AnalyticsState) => totalFocus(a) >= 50 * 3600000 },
  { id: "hundred-hours", label: "100 Hours", test: (a: AnalyticsState) => totalFocus(a) >= 100 * 3600000 },
  { id: "no-distractions", label: "No Distractions", test: (a: AnalyticsState) => Object.values(a.days).some((d) => d.completedSessions > 0 && d.distractionAttempts === 0) },
  { id: "seven-day-streak", label: "7-Day Streak", test: (a: AnalyticsState) => currentStreak(a) >= 7 },
  { id: "deep-work-master", label: "Deep Work Master", test: (a: AnalyticsState) => a.longestSessionMs >= 3 * 3600000 }
];

export const totalFocus = (analytics: AnalyticsState) =>
  Object.values(analytics.days).reduce((sum, day) => sum + day.focusMs, 0);

export const currentStreak = (analytics: AnalyticsState) => {
  let streak = 0;
  const cursor = new Date();
  while (true) {
    const key = todayKey(cursor);
    if (!analytics.days[key]?.completedSessions) return streak;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
};

export const completeMissionAnalytics = (analytics: AnalyticsState, mission: FocusMission) => {
  const key = todayKey();
  const day = analytics.days[key] ?? {
    date: key,
    focusMs: 0,
    distractionAttempts: 0,
    completedSessions: 0
  };
  const sessionMs = mission.durationMinutes * 60000;
  const next: AnalyticsState = {
    ...analytics,
    days: {
      ...analytics.days,
      [key]: {
        ...day,
        focusMs: day.focusMs + sessionMs,
        distractionAttempts: day.distractionAttempts + mission.distractionAttempts,
        completedSessions: day.completedSessions + 1
      }
    },
    longestSessionMs: Math.max(analytics.longestSessionMs, sessionMs),
    totalCompletedSessions: analytics.totalCompletedSessions + 1
  };
  next.achievements = unlockedAchievements(next);
  return next;
};

export const recordBlockedAttempt = (analytics: AnalyticsState, hostname: string) => {
  const key = todayKey();
  const day = analytics.days[key] ?? {
    date: key,
    focusMs: 0,
    distractionAttempts: 0,
    completedSessions: 0
  };
  return {
    ...analytics,
    days: {
      ...analytics.days,
      [key]: { ...day, distractionAttempts: day.distractionAttempts + 1 }
    },
    blockedWebsites: {
      ...analytics.blockedWebsites,
      [hostname]: (analytics.blockedWebsites[hostname] ?? 0) + 1
    }
  };
};

export const unlockedAchievements = (analytics: AnalyticsState) =>
  achievementRules.filter((rule) => rule.test(analytics)).map((rule) => rule.label);
