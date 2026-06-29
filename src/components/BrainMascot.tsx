type Mood = "happy" | "neutral" | "sad" | "excited";

const moods: Record<Mood, { mouth: string; brows: string; glow: string }> = {
  happy: { mouth: "M27 38 Q40 48 53 38", brows: "M24 25 Q29 21 34 25 M46 25 Q51 21 56 25", glow: "#45e1ff" },
  neutral: { mouth: "M29 40 H51", brows: "M24 24 H34 M46 24 H56", glow: "#94a3b8" },
  sad: { mouth: "M28 45 Q40 35 52 45", brows: "M24 23 Q30 27 35 23 M45 23 Q50 27 56 23", glow: "#fb7185" },
  excited: { mouth: "M27 37 Q40 52 53 37", brows: "M23 23 Q30 16 36 23 M44 23 Q50 16 57 23", glow: "#5eead4" }
};

const levels = [
  { stroke: "#94a3b8", fill: "rgba(148,163,184,0.12)", glow: 1 },
  { stroke: "#cbd5e1", fill: "rgba(203,213,225,0.14)", glow: 1.2 },
  { stroke: "#45e1ff", fill: "rgba(69,225,255,0.18)", glow: 1.5 },
  { stroke: "#5eead4", fill: "rgba(94,234,212,0.2)", glow: 1.8 },
  { stroke: "#8b5cf6", fill: "rgba(139,92,246,0.24)", glow: 2.1 },
  { stroke: "#facc15", fill: "rgba(250,204,21,0.24)", glow: 2.4 },
  { stroke: "#ffffff", fill: "rgba(94,234,212,0.28)", glow: 2.8 }
];

export const brainLevelFromFocusMs = (focusMs: number) => {
  const hours = focusMs / 3600000;
  if (hours >= 100) return 7;
  if (hours >= 50) return 6;
  if (hours >= 25) return 5;
  if (hours >= 10) return 4;
  if (hours >= 3) return 3;
  if (hours >= 1) return 2;
  return 1;
};

export function BrainMascot({
  mood = "happy",
  size = 88,
  level = 3,
  dimmed = false,
  animated = false
}: {
  mood?: Mood;
  size?: number;
  level?: number;
  dimmed?: boolean;
  animated?: boolean;
}) {
  const state = moods[mood];
  const evolution = levels[Math.max(0, Math.min(6, level - 1))];
  const glow = dimmed ? Math.max(0.75, evolution.glow - 0.45) : evolution.glow;
  const eyesOpen = level >= 2 || mood !== "neutral";
  const neural = level >= 4;
  return (
    <svg
      className={animated ? "brain-pulse" : undefined}
      width={size}
      height={size}
      viewBox="0 0 80 80"
      role="img"
      aria-label={`Brain is level ${level}`}
    >
      <defs>
        <filter id={`glow-${mood}-${level}-${size}`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation={3 + glow} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx="40" cy="40" r="31" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.18)" />
      <path
        d="M23 48c-7-2-11-8-10-15 1-7 6-11 12-12 3-7 12-10 19-6 6-3 15 0 18 8 6 2 10 8 8 16-1 8-8 13-16 13H29c-2 0-4-1-6-4Z"
        fill={evolution.fill}
        stroke={level < 3 ? evolution.stroke : state.glow === "#94a3b8" ? evolution.stroke : state.glow}
        strokeWidth="2"
        filter={`url(#glow-${mood}-${level}-${size})`}
      />
      {neural ? (
        <path d="M31 20v33M44 17v36M55 24v27M22 34h43M25 45h35" stroke="rgba(255,255,255,0.28)" strokeWidth="2" />
      ) : null}
      <path d={state.brows} stroke="#fff" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {eyesOpen ? (
        <>
          <circle cx="31" cy="32" r="2.8" fill="#fff" />
          <circle cx="49" cy="32" r="2.8" fill="#fff" />
        </>
      ) : (
        <path d="M28 32h7M46 32h7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      )}
      <path d={state.mouth} stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}
