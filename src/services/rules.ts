import { FocusMission, SiteDecision } from "../types";
import { domainMatches, hostnameFromUrl } from "../utils/domains";

const youtubeEducationSignals = [
  "playlist",
  "list=",
  "learn",
  "course",
  "tutorial",
  "lecture",
  "programming",
  "study"
];

const youtubeBlockedPaths = ["/", "/shorts", "/feed/trending", "/feed/subscriptions", "/gaming"];

export const decideSite = (url: string, mission: FocusMission): SiteDecision => {
  const hostname = hostnameFromUrl(url);
  if (!hostname || url.startsWith(chrome.runtime.getURL(""))) {
    return { action: "allow", reason: "Extension page", bypassSeconds: 0 };
  }

  if (mission.emergencyExitUntil && Date.now() < mission.emergencyExitUntil) {
    return { action: "allow", reason: "Emergency exit is active", bypassSeconds: 0 };
  }

  if (mission.protectionMode === "nuclear") {
    const allowed = mission.allowedSites.some((site) => domainMatches(hostname, site));
    return allowed
      ? { action: "allow", reason: "Allowed for this mission", bypassSeconds: 0 }
      : { action: "block", reason: "Nuclear mode allows mission sites only", bypassSeconds: 0 };
  }

  if (hostname.endsWith("youtube.com")) {
    return decideYoutube(url, mission);
  }

  if (mission.allowedSites.some((site) => domainMatches(hostname, site))) {
    return { action: "allow", reason: "Allowed for this mission", bypassSeconds: 0 };
  }

  if (mission.blockedSites.some((site) => domainMatches(hostname, site))) {
    return modeDecision(mission.protectionMode, "This site is on your blocked list");
  }

  return modeDecision(mission.protectionMode, "Choose the page that supports your mission best");
};

const decideYoutube = (url: string, mission: FocusMission): SiteDecision => {
  const parsed = new URL(url);
  const full = url.toLowerCase();
  const explicitAllowed = mission.allowedSites.some((site) => domainMatches("youtube.com", site));
  const education = youtubeEducationSignals.some((signal) => full.includes(signal));
  const blockedArea = youtubeBlockedPaths.some((path) => parsed.pathname === path || parsed.pathname.startsWith(path + "/"));

  if (explicitAllowed || education) {
    return { action: "allow", reason: "Educational YouTube page", bypassSeconds: 0 };
  }

  if (blockedArea || parsed.pathname.startsWith("/watch")) {
    return modeDecision(mission.protectionMode, "Keep YouTube focused on intentional learning");
  }

  return modeDecision(mission.protectionMode, "Use YouTube for the learning you planned");
};

const modeDecision = (mode: FocusMission["protectionMode"], reason: string): SiteDecision => {
  if (mode === "soft") return { action: "warn", reason, bypassSeconds: 5 };
  if (mode === "medium") return { action: "warn", reason, bypassSeconds: 15 };
  return { action: "block", reason, bypassSeconds: 0 };
};
