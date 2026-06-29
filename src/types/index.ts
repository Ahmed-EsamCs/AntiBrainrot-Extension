export type ProtectionMode = "soft" | "medium" | "hard" | "nuclear";
export type MissionStatus = "idle" | "active" | "paused" | "completed";
export type ThemeMode = "dark" | "system";
export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = "todo" | "in-progress" | "paused" | "completed";

export interface FocusTask {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  estimatedMinutes: number;
  createdAt: number;
  completedAt?: number;
  totalTimeSpentMs: number;
  sessionCount: number;
  lastSessionDate?: number;
  longestSessionMs: number;
}

export interface FocusMission {
  id: string;
  taskId: string;
  name: string;
  durationMinutes: number;
  startedAt: number;
  endsAt: number;
  pausedAt?: number;
  pausedMs: number;
  elapsedMs: number;
  activeStartedAt?: number;
  lastCommittedElapsedMs: number;
  status: MissionStatus;
  allowedSites: string[];
  blockedSites: string[];
  protectionMode: ProtectionMode;
  emergencyExitUsed: boolean;
  emergencyExitUntil?: number;
  distractionAttempts: number;
}

export interface Settings {
  theme: ThemeMode;
  protectionMode: ProtectionMode;
  notificationsEnabled: boolean;
  emergencyExitEnabled: boolean;
  breakDurationMinutes: 5 | 10 | 15;
  soundEffects: boolean;
  quotesEnabled: boolean;
  defaultAllowedSites: string[];
  defaultBlockedSites: string[];
}

export interface AnalyticsDay {
  date: string;
  focusMs: number;
  distractionAttempts: number;
  completedSessions: number;
}

export interface AnalyticsState {
  days: Record<string, AnalyticsDay>;
  longestSessionMs: number;
  totalCompletedSessions: number;
  blockedWebsites: Record<string, number>;
  achievements: string[];
}

export interface AppState {
  mission?: FocusMission;
  tasks: FocusTask[];
  settings: Settings;
  analytics: AnalyticsState;
}

export interface SiteDecision {
  action: "allow" | "warn" | "block";
  reason: string;
  bypassSeconds: number;
}
