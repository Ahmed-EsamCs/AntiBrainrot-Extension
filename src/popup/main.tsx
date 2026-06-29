import "../styles.css";
import {
  Check,
  Clock,
  Edit3,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Settings,
  Shield,
  Square,
  Target,
  Trash2,
  Zap
} from "lucide-react";
import { FormEvent, ReactNode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrainMascot, brainLevelFromFocusMs } from "../components/BrainMascot";
import { Button } from "../components/Button";
import { Field, TextArea, TextInput } from "../components/Field";
import { StatCard } from "../components/StatCard";
import { currentStreak, totalFocus } from "../services/analytics";
import {
  averageSessionDuration,
  missionProgress,
  remainingMissionMs,
  taskCompletionPercentage,
  taskPriorityLabel,
  taskStatusLabel
} from "../services/tasks";
import { defaultSettings } from "../storage/defaults";
import { updateState } from "../storage/store";
import { FocusMission, FocusTask, TaskPriority, TaskStatus } from "../types";
import { normalizeDomainInput } from "../utils/domains";
import { formatTimer, humanDuration } from "../utils/time";
import { useAppState } from "../hooks/useAppState";

type View = "focus" | "tasks" | "details";

function App() {
  const state = useAppState();
  const settings = state?.settings ?? defaultSettings;
  const mission = state?.mission;
  const [now, setNow] = useState(Date.now());
  const [view, setView] = useState<View>("focus");
  const [selectedTaskId, setSelectedTaskId] = useState<string>();

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!state) return <Shell>Loading...</Shell>;

  const focusMs = Math.max(
    totalFocus(state.analytics),
    state.tasks.reduce((sum, task) => sum + task.totalTimeSpentMs, 0)
  );
  const brainLevel = brainLevelFromFocusMs(focusMs);
  const selectedTask =
    state.tasks.find((task) => task.id === selectedTaskId) ??
    state.tasks.find((task) => task.id === mission?.taskId) ??
    state.tasks[0];

  return (
    <Shell>
      <header className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan">AntiBrainrot</p>
          <h1 className="mt-1 text-2xl font-semibold">Stay Locked In.</h1>
        </div>
        <button
          className="focus-ring rounded-lg p-2 text-white/65 transition hover:bg-white/10 hover:text-white"
          onClick={() => chrome.runtime.openOptionsPage()}
          title="Settings"
        >
          <Settings size={19} />
        </button>
      </header>

      <div className="mb-4 grid grid-cols-3 gap-2 rounded-lg border border-white/10 bg-white/[0.05] p-1">
        {(["focus", "tasks", "details"] as View[]).map((item) => (
          <button
            className={`rounded-md px-3 py-2 text-sm font-semibold capitalize transition ${view === item ? "bg-cyan text-ink" : "text-white/58 hover:bg-white/10 hover:text-white"}`}
            key={item}
            onClick={() => setView(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {view === "focus" ? (
        mission ? (
          <ActiveMission
            mission={mission}
            now={now}
            task={state.tasks.find((item) => item.id === mission.taskId)}
            settings={settings}
            brainLevel={brainLevel}
          />
        ) : (
          <StartMission settings={settings} tasks={state.tasks} selectedTaskId={selectedTask?.id} />
        )
      ) : null}

      {view === "tasks" ? (
        <TaskManager
          tasks={state.tasks}
          onSelect={(taskId) => {
            setSelectedTaskId(taskId);
            setView("details");
          }}
        />
      ) : null}

      {view === "details" ? (
        selectedTask ? <TaskDetails task={selectedTask} /> : <EmptyTasks onCreate={() => setView("tasks")} />
      ) : null}

      <section className="mt-4 grid grid-cols-2 gap-3">
        <StatCard label="Today" value={humanDuration(state.analytics.days[new Date().toISOString().slice(0, 10)]?.focusMs ?? 0)} icon={<Clock size={14} />} />
        <StatCard label="Streak" value={`${currentStreak(state.analytics)} days`} icon={<Shield size={14} />} />
        <StatCard label="Brain" value={`Level ${brainLevel}`} icon={<Target size={14} />} />
        <StatCard label="Tasks" value={String(state.tasks.length)} icon={<RotateCcw size={14} />} />
      </section>
    </Shell>
  );
}

function ActiveMission({
  mission,
  now,
  task,
  settings,
  brainLevel
}: {
  mission: FocusMission;
  now: number;
  task?: FocusTask;
  settings: typeof defaultSettings;
  brainLevel: number;
}) {
  const remaining = remainingMissionMs(mission, now);
  const progress = missionProgress(mission, now);
  const active = mission.status === "active";
  const paused = mission.status === "paused";
  const completed = mission.status === "completed";

  return (
    <section className="glass rounded-xl p-4">
      <div className="flex items-center gap-4">
        <BrainMascot
          mood={completed ? "excited" : active ? "happy" : "neutral"}
          level={brainLevel}
          animated={active}
          size={78}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-white/55">{task?.title ?? "Focus Task"}</p>
          <h2 className="truncate text-xl font-semibold">{mission.name}</h2>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-sm capitalize text-white/55">{mission.status}</span>
            {paused ? <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-cyan">Paused</span> : null}
          </div>
        </div>
      </div>
      <div className="mt-5 text-center">
        <div className="font-mono text-5xl font-semibold tabular-nums">{formatTimer(remaining)}</div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="meter h-full rounded-full transition-all" style={{ width: `${Math.min(100, progress * 100)}%` }} />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2">
        <Button disabled={!active} onClick={() => send("PAUSE_MISSION")}>
          <Pause size={16} /> Pause
        </Button>
        <Button disabled={!paused} onClick={() => send("RESUME_MISSION")}>
          <Play size={16} /> Resume
        </Button>
        <Button variant="danger" onClick={() => send("STOP_MISSION")}>
          <Square size={16} /> Stop
        </Button>
      </div>
      <Button
        className="mt-3 w-full"
        variant="ghost"
        disabled={!settings.emergencyExitEnabled || mission.emergencyExitUsed || !active}
        onClick={() => send("EMERGENCY_EXIT")}
      >
        <Zap size={16} /> Emergency Exit
      </Button>
      <SiteList title="Allowed Sites" sites={mission.allowedSites} />
    </section>
  );
}

function StartMission({
  settings,
  tasks,
  selectedTaskId
}: {
  settings: typeof defaultSettings;
  tasks: FocusTask[];
  selectedTaskId?: string;
}) {
  const firstReadyTask = tasks.find((task) => task.status !== "completed") ?? tasks[0];
  const [taskId, setTaskId] = useState(selectedTaskId ?? firstReadyTask?.id ?? "");
  const task = tasks.find((item) => item.id === taskId);
  const [name, setName] = useState(task?.title ?? "Focus Mission");
  const [duration, setDuration] = useState(task?.estimatedMinutes ?? 120);
  const [allowed, setAllowed] = useState(settings.defaultAllowedSites.join("\n"));
  const [blocked, setBlocked] = useState(settings.defaultBlockedSites.join("\n"));

  useEffect(() => {
    const next = tasks.find((item) => item.id === taskId);
    if (!next) return;
    setName(next.title);
    setDuration(next.estimatedMinutes);
  }, [taskId, tasks]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!task) return;
    const startedAt = Date.now();
    const mission: FocusMission = {
      id: crypto.randomUUID(),
      taskId: task.id,
      name,
      durationMinutes: duration,
      startedAt,
      endsAt: startedAt + duration * 60000,
      pausedMs: 0,
      elapsedMs: 0,
      activeStartedAt: startedAt,
      lastCommittedElapsedMs: 0,
      status: "active",
      allowedSites: normalizeDomainInput(allowed),
      blockedSites: normalizeDomainInput(blocked),
      protectionMode: settings.protectionMode,
      emergencyExitUsed: false,
      distractionAttempts: 0
    };
    send("START_MISSION", mission);
  };

  if (!tasks.length) {
    return (
      <EmptyTasks
        onCreate={() =>
          updateState((state) => ({
            ...state,
            tasks: [
              {
                id: crypto.randomUUID(),
                title: "New Focus Task",
                description: "Ready when you are.",
                priority: "medium",
                status: "todo",
                estimatedMinutes: 60,
                createdAt: Date.now(),
                totalTimeSpentMs: 0,
                sessionCount: 0,
                longestSessionMs: 0
              },
              ...state.tasks
            ]
          }))
        }
      />
    );
  }

  return (
    <form className="glass grid gap-4 rounded-xl p-4" onSubmit={submit}>
      <div className="flex items-center gap-4">
        <BrainMascot mood="happy" level={2} size={72} />
        <div>
          <h2 className="text-xl font-semibold">Create Focus Mission</h2>
          <p className="text-sm text-white/55">Choose the task worth protecting.</p>
        </div>
      </div>
      <Field label="Task">
        <select
          className="focus-ring w-full rounded-lg border border-white/10 bg-white/[0.07] px-3 py-2.5 text-sm text-white"
          value={taskId}
          onChange={(event) => setTaskId(event.target.value)}
          required
        >
          {tasks.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Mission">
        <TextInput value={name} onChange={(event) => setName(event.target.value)} required />
      </Field>
      <Field label="Duration">
        <TextInput type="number" min={5} max={480} value={duration} onChange={(event) => setDuration(Number(event.target.value))} />
      </Field>
      <Field label="Allowed Websites" hint="One domain per line. These stay open during the mission.">
        <TextArea value={allowed} onChange={(event) => setAllowed(event.target.value)} />
      </Field>
      <Field label="Blocked Websites">
        <TextArea value={blocked} onChange={(event) => setBlocked(event.target.value)} />
      </Field>
      <Button variant="primary" className="w-full" type="submit">
        <Play size={16} /> Start Focus
      </Button>
    </form>
  );
}

function TaskManager({ tasks, onSelect }: { tasks: FocusTask[]; onSelect: (taskId: string) => void }) {
  const [editing, setEditing] = useState<FocusTask | undefined>();
  const [creating, setCreating] = useState(!tasks.length);

  return (
    <section className="grid gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Tasks</h2>
        <Button variant="primary" onClick={() => setCreating(true)}>
          <Plus size={16} /> New Task
        </Button>
      </div>
      {creating || editing ? (
        <TaskForm
          task={editing}
          onDone={() => {
            setCreating(false);
            setEditing(undefined);
          }}
        />
      ) : null}
      <div className="grid gap-3">
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} onEdit={() => setEditing(task)} onSelect={() => onSelect(task.id)} />
        ))}
      </div>
    </section>
  );
}

function TaskForm({ task, onDone }: { task?: FocusTask; onDone: () => void }) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "medium");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "todo");
  const [estimatedMinutes, setEstimatedMinutes] = useState(task?.estimatedMinutes ?? 60);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const now = Date.now();
    const next: FocusTask = {
      id: task?.id ?? crypto.randomUUID(),
      title,
      description,
      priority,
      status,
      estimatedMinutes,
      createdAt: task?.createdAt ?? now,
      completedAt: status === "completed" ? task?.completedAt ?? now : undefined,
      totalTimeSpentMs: task?.totalTimeSpentMs ?? 0,
      sessionCount: task?.sessionCount ?? 0,
      lastSessionDate: task?.lastSessionDate,
      longestSessionMs: task?.longestSessionMs ?? 0
    };
    await updateState((state) => ({
      ...state,
      tasks: task ? state.tasks.map((item) => (item.id === task.id ? next : item)) : [next, ...state.tasks]
    }));
    onDone();
  };

  return (
    <form className="glass grid gap-3 rounded-xl p-4" onSubmit={submit}>
      <Field label="Title">
        <TextInput value={title} onChange={(event) => setTitle(event.target.value)} required />
      </Field>
      <Field label="Description">
        <TextArea value={description} onChange={(event) => setDescription(event.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Priority">
          <select className="focus-ring rounded-lg border border-white/10 bg-white/[0.07] px-3 py-2.5 text-sm text-white" value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </Field>
        <Field label="Status">
          <select className="focus-ring rounded-lg border border-white/10 bg-white/[0.07] px-3 py-2.5 text-sm text-white" value={status} onChange={(event) => setStatus(event.target.value as TaskStatus)}>
            <option value="todo">Todo</option>
            <option value="in-progress">In Progress</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
          </select>
        </Field>
      </div>
      <Field label="Estimated Duration">
        <TextInput type="number" min={5} value={estimatedMinutes} onChange={(event) => setEstimatedMinutes(Number(event.target.value))} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Button type="submit" variant="primary">
          {task ? "Save Task" : "Create Task"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function TaskRow({ task, onEdit, onSelect }: { task: FocusTask; onEdit: () => void; onSelect: () => void }) {
  const complete = () =>
    updateState((state) => ({
      ...state,
      tasks: state.tasks.map((item) =>
        item.id === task.id ? { ...item, status: "completed", completedAt: Date.now() } : item
      )
    }));
  const pause = () =>
    updateState((state) => ({
      ...state,
      tasks: state.tasks.map((item) => (item.id === task.id ? { ...item, status: "paused" } : item))
    }));
  const resume = () =>
    updateState((state) => ({
      ...state,
      tasks: state.tasks.map((item) => (item.id === task.id ? { ...item, status: "in-progress" } : item))
    }));
  const remove = () =>
    updateState((state) => ({
      ...state,
      tasks: state.tasks.filter((item) => item.id !== task.id),
      mission: state.mission?.taskId === task.id ? undefined : state.mission
    }));

  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.06] p-3">
      <button className="w-full text-left" onClick={onSelect}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-white">{task.title}</h3>
            <p className="mt-1 text-xs text-white/45">
              {taskPriorityLabel(task.priority)} priority - {taskStatusLabel(task.status)}
            </p>
          </div>
          <span className="rounded-full border border-cyan/30 bg-cyan/10 px-2 py-1 text-xs text-cyan">
            {taskCompletionPercentage(task)}%
          </span>
        </div>
      </button>
      <div className="mt-3 flex flex-wrap gap-2">
        <IconButton label="Edit" onClick={onEdit}>
          <Edit3 size={15} />
        </IconButton>
        <IconButton label="Done" onClick={complete}>
          <Check size={15} />
        </IconButton>
        <IconButton label="Pause" onClick={pause}>
          <Pause size={15} />
        </IconButton>
        <IconButton label="Resume" onClick={resume}>
          <Play size={15} />
        </IconButton>
        <IconButton label="Delete" onClick={remove}>
          <Trash2 size={15} />
        </IconButton>
      </div>
    </article>
  );
}

function TaskDetails({ task }: { task: FocusTask }) {
  return (
    <section className="glass rounded-xl p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan">Task Details</p>
          <h2 className="mt-1 truncate text-2xl font-semibold">{task.title}</h2>
          {task.description ? <p className="mt-2 text-sm leading-relaxed text-white/55">{task.description}</p> : null}
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">{taskStatusLabel(task.status)}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <StatCard label="Spent" value={humanDuration(task.totalTimeSpentMs)} />
        <StatCard label="Sessions" value={String(task.sessionCount)} />
        <StatCard label="Average" value={humanDuration(averageSessionDuration(task))} />
        <StatCard label="Complete" value={`${taskCompletionPercentage(task)}%`} />
        <StatCard label="Longest" value={humanDuration(task.longestSessionMs)} />
        <StatCard label="Last Work" value={task.lastSessionDate ? new Date(task.lastSessionDate).toLocaleDateString() : "Not yet"} />
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="meter h-full rounded-full" style={{ width: `${taskCompletionPercentage(task)}%` }} />
      </div>
    </section>
  );
}

function EmptyTasks({ onCreate }: { onCreate?: () => void }) {
  return (
    <section className="glass rounded-xl p-4 text-center">
      <BrainMascot mood="happy" level={1} size={82} />
      <h2 className="mt-2 text-xl font-semibold">Create your first task</h2>
      <p className="mt-1 text-sm text-white/55">Focus sessions now attach to a task so your progress stays visible.</p>
      {onCreate ? (
        <Button className="mt-4" variant="primary" onClick={onCreate}>
          <Plus size={16} /> New Task
        </Button>
      ) : null}
    </section>
  );
}

function IconButton({ label, children, onClick }: { label: string; children: ReactNode; onClick: () => void }) {
  return (
    <button
      className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-white/70 transition hover:bg-white/12 hover:text-white"
      onClick={onClick}
      title={label}
    >
      {children}
    </button>
  );
}

function SiteList({ title, sites }: { title: string; sites: string[] }) {
  return (
    <div className="mt-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/40">{title}</p>
      <div className="flex flex-wrap gap-2">
        {sites.slice(0, 8).map((site) => (
          <span className="rounded-full border border-white/10 bg-white/[0.07] px-2.5 py-1 text-xs text-white/70" key={site}>
            {site}
          </span>
        ))}
      </div>
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return <main className="soft-grid min-h-[620px] w-[420px] p-4 text-white">{children}</main>;
}

function send(type: string, payload?: unknown) {
  void chrome.runtime.sendMessage({ type, payload });
}

createRoot(document.getElementById("root")!).render(<App />);
