import { AppState, FocusMission, Settings } from "../types";
import { defaultAnalytics, defaultSettings } from "./defaults";

const APP_KEY = "antibrainrot:state";

const storage = chrome.storage.local;

export const getState = async (): Promise<AppState> => {
  const result = await storage.get(APP_KEY);
  const stored = (result[APP_KEY] ?? {}) as Partial<AppState>;
  return {
    ...stored,
    settings: { ...defaultSettings, ...(stored.settings ?? {}) },
    analytics: { ...defaultAnalytics, ...(stored.analytics ?? {}) },
    tasks: stored.tasks ?? []
  };
};

export const setState = async (state: AppState) => storage.set({ [APP_KEY]: state });

export const updateState = async (updater: (state: AppState) => AppState | Promise<AppState>) => {
  const current = await getState();
  const next = await updater(current);
  await setState(next);
  return next;
};

export const saveMission = (mission?: FocusMission) =>
  updateState((state) => ({ ...state, mission }));

export const saveSettings = (settings: Settings) =>
  updateState((state) => ({ ...state, settings }));

export const subscribeState = (listener: (state: AppState) => void) => {
  const handler = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
    if (areaName === "local" && changes[APP_KEY]?.newValue) {
      void getState().then(listener);
    }
  };
  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
};
