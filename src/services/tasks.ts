import { FocusMission, FocusTask } from "../types";

export const taskStatusLabel = (status: FocusTask["status"]) =>
  ({
    todo: "Todo",
    "in-progress": "In Progress",
    paused: "Paused",
    completed: "Completed"
  })[status];

export const taskPriorityLabel = (priority: FocusTask["priority"]) =>
  ({
    low: "Low",
    medium: "Medium",
    high: "High"
  })[priority];

export const currentMissionElapsed = (mission: FocusMission, now = Date.now()) =>
  mission.elapsedMs +
  (mission.status === "active" && mission.activeStartedAt
    ? Math.max(0, now - mission.activeStartedAt)
    : 0);

export const remainingMissionMs = (mission: FocusMission, now = Date.now()) =>
  Math.max(0, mission.durationMinutes * 60000 - currentMissionElapsed(mission, now));

export const missionProgress = (mission: FocusMission, now = Date.now()) =>
  Math.min(1, currentMissionElapsed(mission, now) / (mission.durationMinutes * 60000));

export const taskCompletionPercentage = (task: FocusTask) => {
  if (task.status === "completed") return 100;
  if (!task.estimatedMinutes) return 0;
  return Math.min(99, Math.round((task.totalTimeSpentMs / (task.estimatedMinutes * 60000)) * 100));
};

export const averageSessionDuration = (task: FocusTask) =>
  task.sessionCount ? task.totalTimeSpentMs / task.sessionCount : 0;

export const commitMissionTimeToTask = (
  task: FocusTask,
  mission: FocusMission,
  options: { completeTask?: boolean; now?: number } = {}
): { task: FocusTask; mission: FocusMission; sessionDeltaMs: number } => {
  const now = options.now ?? Date.now();
  const elapsed = currentMissionElapsed(mission, now);
  const sessionDeltaMs = Math.max(0, elapsed - mission.lastCommittedElapsedMs);
  const nextTotal = task.totalTimeSpentMs + sessionDeltaMs;
  const nextSessionMs = task.longestSessionMs < elapsed ? elapsed : task.longestSessionMs;

  return {
    sessionDeltaMs,
    mission: {
      ...mission,
      elapsedMs: elapsed,
      activeStartedAt: mission.status === "active" ? now : undefined,
      lastCommittedElapsedMs: elapsed
    },
    task: {
      ...task,
      status: options.completeTask ? "completed" : task.status,
      completedAt: options.completeTask ? now : task.completedAt,
      totalTimeSpentMs: nextTotal,
      lastSessionDate: now,
      longestSessionMs: nextSessionMs
    }
  };
};
