import { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

export function Field({
  label,
  hint,
  children
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm text-white/78">
      <span className="font-medium text-white">{label}</span>
      {children}
      {hint ? <span className="text-xs leading-relaxed text-white/45">{hint}</span> : null}
    </label>
  );
}

const control =
  "focus-ring w-full rounded-lg border border-white/10 bg-white/[0.07] px-3 py-2.5 text-sm text-white placeholder:text-white/30";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={control} {...props} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${control} min-h-24 resize-y leading-relaxed`} {...props} />;
}
