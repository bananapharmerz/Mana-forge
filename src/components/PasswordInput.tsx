"use client";

import { useState, type InputHTMLAttributes } from "react";

/** A password field with a Show/Hide button, so people can check what they typed (on phones especially). */
export default function PasswordInput({ className = "", ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={show ? "text" : "password"} autoCapitalize="none" spellCheck={false} className={`${className} pr-16`} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        className="absolute inset-y-0 right-0 px-3 text-xs font-semibold text-muted hover:text-gold-bright"
      >
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}
