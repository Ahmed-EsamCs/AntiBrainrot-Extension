import { ReactNode } from "react";

export function StatCard({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.06] p-3">
      <div className="mb-2 flex items-center gap-2 text-white/45">
        {icon}
        <span className="text-xs font-medium uppercase tracking-[0.16em]">{label}</span>
      </div>
      <div className="text-xl font-semibold text-white">{value}</div>
    </div>
  );
}
