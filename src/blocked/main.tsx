import "../styles.css";
import { ArrowLeft, Clock, Shield, Target, Zap } from "lucide-react";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrainMascot, brainLevelFromFocusMs } from "../components/BrainMascot";
import { Button } from "../components/Button";
import { currentStreak, totalFocus } from "../services/analytics";
import { missionProgress, remainingMissionMs } from "../services/tasks";
import arabicQuotes from "../data/arabicQuotes.json";
import { randomFrom } from "../utils/motivation";
import { formatTimer } from "../utils/time";
import { useAppState } from "../hooks/useAppState";

function BlockedApp() {
  const params = new URLSearchParams(location.search);
  const target = params.get("target") ?? "";
  const reason = params.get("reason") ?? "Keep your attention close to the mission.";
  const wait = Number(params.get("wait") ?? 0);
  const mode = params.get("mode") ?? "medium";
  const [now, setNow] = useState(Date.now());
  const [countdown, setCountdown] = useState(wait);
  const state = useAppState();
  const quote = useMemo(() => randomFrom(arabicQuotes), []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(Date.now());
      setCountdown((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const mission = state?.mission;
  const task = state?.tasks.find((item) => item.id === mission?.taskId);
  const remaining = mission ? remainingMissionMs(mission, now) : 0;
  const progress = mission ? missionProgress(mission, now) : 0;
  const canContinue = countdown === 0 && (mode === "soft" || mode === "medium");
  const hard = mode === "hard" || mode === "nuclear";
  const focusMs = state
    ? Math.max(
        totalFocus(state.analytics),
        state.tasks.reduce((sum, item) => sum + item.totalTimeSpentMs, 0)
      )
    : 0;
  const brainLevel = brainLevelFromFocusMs(focusMs);
  const streak = state ? currentStreak(state.analytics) : 0;

  return (
    <main className="soft-grid flex min-h-screen items-center justify-center px-5 py-8 text-white">
      <section className="glass w-full max-w-4xl rounded-xl p-6 text-center md:p-8">
        <div className="mx-auto flex w-fit justify-center">
          <BrainMascot mood="happy" level={brainLevel} dimmed animated size={128} />
        </div>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.24em] text-cyan">Stay Locked In.</p>
        <h1 className="mt-3 text-4xl font-semibold md:text-6xl">Keep Going.</h1>
        <p className="mx-auto mt-4 max-w-xl text-2xl leading-relaxed text-white/78" dir="rtl">
          {quote}
        </p>

        <div className="mx-auto mt-6 max-w-2xl rounded-lg border border-white/10 bg-white/[0.05] p-4 text-left">
          <div className="grid gap-3 md:grid-cols-2">
            <Info label="Task" value={task?.title ?? "Focus task"} icon={<Target size={16} />} />
            <Info label="Mission" value={mission?.name ?? "Focus mission"} icon={<Shield size={16} />} />
            <Info label="Remaining" value={formatTimer(remaining)} icon={<Clock size={16} />} mono />
            <Info label="Current Streak" value={`${streak} days`} icon={<Zap size={16} />} />
          </div>
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-white/40">
              <span>Progress</span>
              <span>{Math.round(progress * 100)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="meter h-full rounded-full transition-all" style={{ width: `${Math.min(100, progress * 100)}%` }} />
            </div>
          </div>
        </div>

        <p className="mx-auto mt-5 max-w-lg text-sm leading-relaxed text-white/55">{reason}</p>
        {target ? <p className="mt-2 truncate text-xs text-white/35">{new URL(target).hostname}</p> : null}

        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Button variant="primary" onClick={() => history.back()}>
            <ArrowLeft size={16} /> Go Back
          </Button>
          <Button disabled={hard || !canContinue} onClick={() => target && location.replace(target)}>
            <Zap size={16} /> {hard ? "Protected" : countdown ? `Continue in ${countdown}s` : "Continue"}
          </Button>
          <Button
            variant="ghost"
            disabled={!mission || mission.emergencyExitUsed}
            onClick={() => chrome.runtime.sendMessage({ type: "EMERGENCY_EXIT" }, () => target && location.replace(target))}
          >
            Emergency Exit
          </Button>
        </div>
      </section>
    </main>
  );
}

function Info({
  label,
  value,
  icon,
  mono = false
}: {
  label: string;
  value: string;
  icon: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.05] p-3">
      <div className="mb-2 flex items-center gap-2 text-white/45">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-[0.16em]">{label}</span>
      </div>
      <div className={`truncate text-lg font-semibold text-white ${mono ? "font-mono tabular-nums" : ""}`}>{value}</div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<BlockedApp />);
