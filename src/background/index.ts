import { completeMissionAnalytics, recordBlockedAttempt, totalFocus } from "../services/analytics";
import { decideSite } from "../services/rules";
import { commitMissionTimeToTask, remainingMissionMs } from "../services/tasks";
import { getState, setState, updateState } from "../storage/store";
import { AppState, FocusMission, TaskStatus } from "../types";
import { hostnameFromUrl } from "../utils/domains";

const COMPLETE_ALARM = "antibrainrot:complete";
const TICK_ALARM = "antibrainrot:tick";

chrome.runtime.onInstalled.addListener(async () => {
  const state = await getState();
  await updateActionIcon(state);
  await finishExpiredMission();
});

chrome.runtime.onStartup.addListener(async () => {
  await getState().then(updateActionIcon);
  await finishExpiredMission();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && Object.values(changes).some((change) => change.newValue?.analytics)) {
    void getState().then(updateActionIcon);
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  void handleMessage(message).then(sendResponse);
  return true;
});

chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.status === "loading" && tab.url) {
    void protectTab(tab.id, tab.url);
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === COMPLETE_ALARM || alarm.name === TICK_ALARM) {
    void finishExpiredMission();
  }
});

async function handleMessage(message: { type: string; payload?: unknown }) {
  switch (message.type) {
    case "START_MISSION":
      return startMission(message.payload as FocusMission);
    case "PAUSE_MISSION":
      return pauseMission();
    case "RESUME_MISSION":
      return resumeMission();
    case "STOP_MISSION":
      return stopMission();
    case "EMERGENCY_EXIT":
      return emergencyExit();
    case "ALLOW_ONCE":
      return { ok: true };
    default:
      return { ok: false };
  }
}

async function startMission(mission: FocusMission) {
  const now = Date.now();
  const preparedMission = {
    ...mission,
    startedAt: now,
    activeStartedAt: now,
    elapsedMs: mission.elapsedMs ?? 0,
    lastCommittedElapsedMs: mission.lastCommittedElapsedMs ?? 0,
    endsAt: now + remainingMissionMs(mission, now)
  };
  const nextState = await updateState((state) => ({
    ...state,
    mission: preparedMission,
    tasks: state.tasks.map((task) =>
      task.id === preparedMission.taskId
        ? { ...task, status: "in-progress", sessionCount: task.sessionCount + 1, lastSessionDate: now }
      : task
    )
  }));
  await updateActionIcon(nextState);
  chrome.alarms.create(COMPLETE_ALARM, { when: preparedMission.endsAt });
  chrome.alarms.create(TICK_ALARM, { periodInMinutes: 1 });
  notify("Mission Started", `${mission.name} is protected.`);
  return { ok: true };
}

async function pauseMission() {
  const state = await getState();
  if (!state.mission || state.mission.status !== "active") return { ok: false };
  const now = Date.now();
  const mission = state.mission;
  const task = state.tasks.find((item) => item.id === mission.taskId);
  const elapsed = (mission.elapsedMs ?? 0) + (mission.activeStartedAt ? Math.max(0, now - mission.activeStartedAt) : 0);
  const committed = task
    ? commitMissionTimeToTask(task, { ...mission, elapsedMs: elapsed, status: "paused", activeStartedAt: undefined }, { now })
    : undefined;
  const nextState: AppState = {
    ...state,
    mission: {
      ...(committed?.mission ?? mission),
      status: "paused" as const,
      pausedAt: now,
      activeStartedAt: undefined,
      elapsedMs: elapsed
    },
    tasks: task
      ? state.tasks.map((item) => (item.id === task.id ? { ...committed!.task, status: "paused" as const } : item))
      : state.tasks
  };
  await setState(nextState);
  await updateActionIcon(nextState);
  chrome.alarms.clear(COMPLETE_ALARM);
  return { ok: true };
}

async function resumeMission() {
  const state = await getState();
  const mission = state.mission;
  if (!mission || mission.status !== "paused" || !mission.pausedAt) return { ok: false };
  const now = Date.now();
  const pausedDelta = Date.now() - mission.pausedAt;
  const next = {
    ...mission,
    status: "active" as const,
    pausedMs: mission.pausedMs + pausedDelta,
    pausedAt: undefined,
    activeStartedAt: now,
    endsAt: now + remainingMissionMs(mission, now)
  };
  const nextState: AppState = {
    ...state,
    mission: next,
    tasks: state.tasks.map((task) =>
      task.id === mission.taskId ? { ...task, status: "in-progress" as const, lastSessionDate: now } : task
    )
  };
  await setState(nextState);
  await updateActionIcon(nextState);
  chrome.alarms.create(COMPLETE_ALARM, { when: next.endsAt });
  notify("Session Resumed", "Keep Going.");
  return { ok: true };
}

async function stopMission() {
  const nextState = await updateState((state) => {
    const mission = state.mission;
    if (!mission) return { ...state, mission: undefined };
    const task = state.tasks.find((item) => item.id === mission.taskId);
    if (!task) return { ...state, mission: undefined };
    const committed = commitMissionTimeToTask(task, mission);
    return {
      ...state,
      mission: undefined,
      tasks: state.tasks.map((item) =>
        item.id === task.id
          ? { ...committed.task, status: (committed.task.status === "completed" ? "completed" : "paused") as TaskStatus }
          : item
      )
    };
  });
  await updateActionIcon(nextState);
  chrome.alarms.clear(COMPLETE_ALARM);
  chrome.alarms.clear(TICK_ALARM);
  return { ok: true };
}

async function emergencyExit() {
  const state = await getState();
  const mission = state.mission;
  if (!mission || mission.emergencyExitUsed) return { ok: false };
  const emergencyExitUntil = Date.now() + 5 * 60000;
  const nextState: AppState = {
    ...state,
    mission: { ...mission, emergencyExitUsed: true, emergencyExitUntil }
  };
  await setState(nextState);
  await updateActionIcon(nextState);
  notify("Break Ending", "Emergency exit ends in 5 minutes.");
  return { ok: true };
}

async function finishExpiredMission() {
  const state = await getState();
  const mission = state.mission;
  if (!mission || mission.status !== "active" || remainingMissionMs(mission) > 0) return;
  const task = state.tasks.find((item) => item.id === mission.taskId);
  const completedMission = { ...mission, elapsedMs: mission.durationMinutes * 60000, status: "completed" as const };
  const committed = task
    ? commitMissionTimeToTask(task, completedMission, { completeTask: true })
    : undefined;
  const analytics = completeMissionAnalytics(state.analytics, completedMission);
  const nextState: AppState = {
    ...state,
    analytics,
    mission: { ...(committed?.mission ?? completedMission), status: "completed" as const },
    tasks: task ? state.tasks.map((item) => (item.id === task.id ? committed!.task : item)) : state.tasks
  };
  await setState(nextState);
  await updateActionIcon(nextState);
  chrome.alarms.clear(COMPLETE_ALARM);
  chrome.alarms.clear(TICK_ALARM);
  notify("Mission Completed", `${mission.name} is complete. Strong work.`);
}

async function protectTab(tabId: number | undefined, url: string) {
  if (!tabId) return;
  const state = await getState();
  const mission = state.mission;
  if (!mission || mission.status !== "active") return;

  const decision = decideSite(url, mission);
  if (decision.action === "allow") return;

  const hostname = hostnameFromUrl(url);
  const nextState: AppState = {
    ...state,
    analytics: recordBlockedAttempt(state.analytics, hostname),
    mission: { ...mission, distractionAttempts: mission.distractionAttempts + 1 }
  };
  await setState(nextState);
  await updateActionIcon(nextState, true);

  const blockedUrl = chrome.runtime.getURL(
    `blocked.html?target=${encodeURIComponent(url)}&mode=${mission.protectionMode}&reason=${encodeURIComponent(decision.reason)}&wait=${decision.bypassSeconds}`
  );
  await chrome.tabs.update(tabId, { url: blockedUrl });
}

async function updateActionIcon(state: AppState, dimmed = false) {
  if (!chrome.action?.setIcon || typeof OffscreenCanvas === "undefined") return;
  const focusMs = Math.max(
    totalFocus(state.analytics),
    state.tasks.reduce((sum, task) => sum + task.totalTimeSpentMs, 0)
  );
  const level = brainLevelFromFocusMs(focusMs);
  const canvas = new OffscreenCanvas(128, 128);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const colors = [
    ["#64748b", "#111827"],
    ["#cbd5e1", "#172033"],
    ["#45e1ff", "#12283c"],
    ["#5eead4", "#123c36"],
    ["#8b5cf6", "#24183e"],
    ["#facc15", "#3b2f11"],
    ["#ffffff", "#143b38"]
  ][level - 1];
  const glowAlpha = dimmed ? 0.18 : 0.25 + level * 0.055;

  ctx.clearRect(0, 0, 128, 128);
  ctx.fillStyle = "#090b12";
  roundRect(ctx, 0, 0, 128, 128, 28);
  ctx.fill();
  ctx.shadowColor = colors[0];
  ctx.shadowBlur = dimmed ? 10 : 8 + level * 5;
  ctx.fillStyle = withAlpha(colors[0], glowAlpha);
  ctx.beginPath();
  ctx.arc(64, 64, 45, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = colors[0];
  ctx.lineWidth = 5;
  ctx.fillStyle = colors[1];
  brainPath(ctx);
  ctx.fill();
  ctx.stroke();

  if (level >= 4) {
    ctx.strokeStyle = withAlpha("#ffffff", 0.38);
    ctx.lineWidth = 4;
    [[49, 40, 49, 84], [68, 35, 68, 85], [86, 48, 86, 80], [36, 58, 98, 58], [42, 75, 92, 75]].forEach(
      ([x1, y1, x2, y2]) => {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    );
  }

  ctx.fillStyle = "#ffffff";
  if (level >= 2) {
    ctx.beginPath();
    ctx.arc(52, 59, 4, 0, Math.PI * 2);
    ctx.arc(77, 59, 4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(47, 59);
    ctx.lineTo(57, 59);
    ctx.moveTo(72, 59);
    ctx.lineTo(82, 59);
    ctx.stroke();
  }
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(47, 76);
  ctx.quadraticCurveTo(64, 88, 82, 76);
  ctx.stroke();

  await chrome.action.setIcon({ imageData: ctx.getImageData(0, 0, 128, 128) });
}

function brainLevelFromFocusMs(focusMs: number) {
  const hours = focusMs / 3600000;
  if (hours >= 100) return 7;
  if (hours >= 50) return 6;
  if (hours >= 25) return 5;
  if (hours >= 10) return 4;
  if (hours >= 3) return 3;
  if (hours >= 1) return 2;
  return 1;
}

function brainPath(ctx: OffscreenCanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.moveTo(38, 76);
  ctx.bezierCurveTo(25, 72, 21, 59, 26, 49);
  ctx.bezierCurveTo(31, 39, 39, 36, 45, 36);
  ctx.bezierCurveTo(51, 22, 68, 23, 77, 31);
  ctx.bezierCurveTo(91, 27, 105, 37, 108, 52);
  ctx.bezierCurveTo(118, 58, 117, 76, 105, 84);
  ctx.bezierCurveTo(99, 88, 92, 90, 83, 90);
  ctx.lineTo(49, 90);
  ctx.bezierCurveTo(44, 90, 40, 85, 38, 76);
}

function roundRect(ctx: OffscreenCanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
}

function withAlpha(hex: string, alpha: number) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function notify(title: string, message: string) {
  void getState().then((state) => {
    if (!state.settings.notificationsEnabled) return;
    chrome.notifications.create({
      type: "basic",
      iconUrl: chrome.runtime.getURL("assets/icon-128.png"),
      title,
      message
    });
  });
}
