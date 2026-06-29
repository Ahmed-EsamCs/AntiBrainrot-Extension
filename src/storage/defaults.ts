import { AnalyticsState, Settings } from "../types";

export const allowedDefaults = [
  "github.com",
  "chat.openai.com",
  "learn.microsoft.com",
  "udemy.com",
  "coursera.org",
  "leetcode.com",
  "stackoverflow.com",
  "developer.mozilla.org"
];

export const blockedDefaults = [
  "facebook.com",
  "instagram.com",
  "x.com",
  "twitter.com",
  "reddit.com",
  "tiktok.com",
  "9gag.com",
  "pinterest.com"
];

export const defaultSettings: Settings = {
  theme: "dark",
  protectionMode: "medium",
  notificationsEnabled: true,
  emergencyExitEnabled: true,
  breakDurationMinutes: 5,
  soundEffects: false,
  quotesEnabled: true,
  defaultAllowedSites: allowedDefaults,
  defaultBlockedSites: blockedDefaults
};

export const defaultAnalytics: AnalyticsState = {
  days: {},
  longestSessionMs: 0,
  totalCompletedSessions: 0,
  blockedWebsites: {},
  achievements: []
};
