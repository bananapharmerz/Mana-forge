// Premium's little mark: a plain flame drawn here (no Magic symbols or art), in the ember colour
// it sits next to. Decorative, so screen readers skip it; the text beside it says "Premium".
export default function PremiumFlame({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false" className={`inline-block shrink-0 ${className}`} fill="currentColor">
      <path d="M8.6 1c.4 2.2-.6 3.4-1.7 4.6C5.8 6.8 4.5 8.1 4.5 10.3 4.5 12.9 6.2 15 8.5 15s4-1.9 4-4.6c0-1.8-.8-3-1.6-4-.2 1.1-.8 1.9-1.6 2.2.5-2.8-.3-5.2-0.7-7.6Z" />
    </svg>
  );
}
