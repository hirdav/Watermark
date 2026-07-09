"use client";

import { useId, useState } from "react";

interface PasswordFieldProps {
  name: string;
  label: string;
  labelExtra?: React.ReactNode;
  autoComplete?: string;
  minLength?: number;
  required?: boolean;
  showStrength?: boolean;
  hint?: string;
}

function strengthOf(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "bg-zinc-200 dark:bg-zinc-800" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const levels = [
    { label: "Too short", color: "bg-red-500" },
    { label: "Weak", color: "bg-red-500" },
    { label: "Fair", color: "bg-amber-500" },
    { label: "Good", color: "bg-amber-500" },
    { label: "Strong", color: "bg-green-500" },
    { label: "Excellent", color: "bg-green-500" },
  ];
  const level = levels[Math.min(score, levels.length - 1)];
  return { score, ...level };
}

export function PasswordField({
  name,
  label,
  labelExtra,
  autoComplete = "current-password",
  minLength,
  required = true,
  showStrength = false,
  hint,
}: PasswordFieldProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState("");
  const strength = showStrength ? strengthOf(value) : null;

  return (
    <div>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {label}
        </label>
        {labelExtra}
      </div>
      <div className="relative mt-1.5">
        <input
          id={id}
          type={visible ? "text" : "password"}
          name={name}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 pr-11 text-sm text-zinc-900 shadow-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-500 dark:focus:ring-zinc-50/10"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          tabIndex={-1}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          {visible ? (
            <svg className="h-4.5 w-4.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.29 10.29 0 003.296-4.163.75.75 0 000-.55C17.925 6.163 14.5 3.25 10 3.25a9.76 9.76 0 00-3.06.49L3.28 2.22zM7.53 6.47l1.3 1.3a2.5 2.5 0 013.4 3.4l1.3 1.3a4 4 0 00-6-6zm-2.62 2.62a10.32 10.32 0 00-1.882 2.454.75.75 0 000 .55C4.075 13.837 7.5 16.75 12 16.75c.933 0 1.822-.13 2.646-.372l-1.362-1.362a4 4 0 01-4.788-4.788L5.91 9.09z" />
            </svg>
          ) : (
            <svg className="h-4.5 w-4.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M10 3.25c-4.5 0-7.925 2.913-9.075 6.79a.75.75 0 000 .55C2.075 14.337 5.5 17.25 10 17.25c4.5 0 7.925-2.913 9.075-6.79a.75.75 0 000-.55C17.925 6.163 14.5 3.25 10 3.25zM10 14a4 4 0 110-8 4 4 0 010 8z" />
              <path d="M10 8.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
            </svg>
          )}
        </button>
      </div>
      {showStrength && value.length > 0 && strength && (
        <div className="mt-2">
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i < strength.score ? strength.color : "bg-zinc-200 dark:bg-zinc-800"
                }`}
              />
            ))}
          </div>
          <p className="mt-1 text-xs text-zinc-500">{strength.label}</p>
        </div>
      )}
      {hint && !value && <p className="mt-1.5 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}
