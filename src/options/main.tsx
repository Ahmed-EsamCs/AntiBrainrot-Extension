import "../styles.css";
import { BarChart3, Bell, RotateCcw, Save, Shield } from "lucide-react";
import { FormEvent, useState } from "react";
import { createRoot } from "react-dom/client";
import { Button } from "../components/Button";
import { Field, TextArea } from "../components/Field";
import { StatCard } from "../components/StatCard";
import { totalFocus, currentStreak } from "../services/analytics";
import { defaultAnalytics } from "../storage/defaults";
import { saveSettings, updateState } from "../storage/store";
import { ProtectionMode, Settings } from "../types";
import { normalizeDomainInput } from "../utils/domains";
import { humanDuration } from "../utils/time";
import { useAppState } from "../hooks/useAppState";

function OptionsApp() {
  const state = useAppState();
  const [saved, setSaved] = useState(false);
  const [localSettings, setLocalSettings] = useState<Settings>();
  const settings = localSettings ?? state?.settings;

  if (!state || !settings) return <main className="min-h-screen p-6 text-white">Loading...</main>;

  const analytics = state.analytics;
  const allowed = settings.defaultAllowedSites.join("\n");
  const blocked = settings.defaultBlockedSites.join("\n");
  const productiveDay = Object.values(analytics.days).sort((a, b) => b.focusMs - a.focusMs)[0];

  const patch = (partial: Partial<Settings>) => setLocalSettings({ ...settings, ...partial });
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await saveSettings(settings);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  return (
    <main className="soft-grid min-h-screen px-5 py-7 text-white">
      <div className="mx-auto max-w-5xl">
        <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan">AntiBrainrot</p>
            <h1 className="mt-2 text-4xl font-semibold">Settings & Analytics</h1>
          </div>
          <Button variant="primary" form="settings-form" type="submit">
            <Save size={16} /> {saved ? "Saved" : "Save"}
          </Button>
        </header>

        <section className="mb-5 grid gap-3 md:grid-cols-4">
          <StatCard label="Focus Time" value={humanDuration(totalFocus(analytics))} icon={<BarChart3 size={14} />} />
          <StatCard label="Current Streak" value={`${currentStreak(analytics)} days`} icon={<Shield size={14} />} />
          <StatCard label="Longest" value={humanDuration(analytics.longestSessionMs)} icon={<Bell size={14} />} />
          <StatCard label="Best Day" value={productiveDay?.date ?? "None yet"} icon={<BarChart3 size={14} />} />
        </section>

        <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
          <form id="settings-form" className="glass grid gap-5 rounded-xl p-5" onSubmit={submit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Protection Mode">
                <select
                  className="focus-ring rounded-lg border border-white/10 bg-white/[0.07] px-3 py-2.5 text-sm text-white"
                  value={settings.protectionMode}
                  onChange={(event) => patch({ protectionMode: event.target.value as ProtectionMode })}
                >
                  <option value="soft">Soft - 5s warning</option>
                  <option value="medium">Medium - 15s warning</option>
                  <option value="hard">Hard - go back only</option>
                  <option value="nuclear">Nuclear - allowed list only</option>
                </select>
              </Field>
              <Field label="Break Duration">
                <select
                  className="focus-ring rounded-lg border border-white/10 bg-white/[0.07] px-3 py-2.5 text-sm text-white"
                  value={settings.breakDurationMinutes}
                  onChange={(event) => patch({ breakDurationMinutes: Number(event.target.value) as 5 | 10 | 15 })}
                >
                  <option value={5}>5 minutes</option>
                  <option value={10}>10 minutes</option>
                  <option value={15}>15 minutes</option>
                </select>
              </Field>
            </div>

            <Toggle label="Notifications" checked={settings.notificationsEnabled} onChange={(value) => patch({ notificationsEnabled: value })} />
            <Toggle label="Emergency Exit" checked={settings.emergencyExitEnabled} onChange={(value) => patch({ emergencyExitEnabled: value })} />
            <Toggle label="Sound Effects" checked={settings.soundEffects} onChange={(value) => patch({ soundEffects: value })} />
            <Toggle label="Quotes" checked={settings.quotesEnabled} onChange={(value) => patch({ quotesEnabled: value })} />

            <Field label="Default Allowed Sites">
              <TextArea defaultValue={allowed} onBlur={(event) => patch({ defaultAllowedSites: normalizeDomainInput(event.target.value) })} />
            </Field>
            <Field label="Default Blocked Sites">
              <TextArea defaultValue={blocked} onBlur={(event) => patch({ defaultBlockedSites: normalizeDomainInput(event.target.value) })} />
            </Field>
          </form>

          <aside className="glass rounded-xl p-5">
            <h2 className="text-xl font-semibold">Achievements</h2>
            <div className="mt-4 grid gap-2">
              {["First Session", "10 Hours", "50 Hours", "100 Hours", "No Distractions", "7-Day Streak", "Deep Work Master"].map((achievement) => {
                const unlocked = analytics.achievements.includes(achievement);
                return (
                  <div className={`rounded-lg border px-3 py-3 text-sm ${unlocked ? "border-cyan/40 bg-cyan/10 text-white" : "border-white/10 bg-white/[0.04] text-white/45"}`} key={achievement}>
                    {unlocked ? "Unlocked" : "Locked"} - {achievement}
                  </div>
                );
              })}
            </div>
            <Button
              className="mt-5 w-full"
              variant="danger"
              onClick={() => updateState((current) => ({ ...current, analytics: defaultAnalytics }))}
            >
              <RotateCcw size={16} /> Reset Analytics
            </Button>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.05] px-3 py-3 text-left"
      onClick={() => onChange(!checked)}
    >
      <span className="font-medium">{label}</span>
      <span className={`h-6 w-11 rounded-full p-1 transition ${checked ? "bg-cyan" : "bg-white/15"}`}>
        <span className={`block h-4 w-4 rounded-full bg-ink transition ${checked ? "translate-x-5" : ""}`} />
      </span>
    </button>
  );
}

createRoot(document.getElementById("root")!).render(<OptionsApp />);
