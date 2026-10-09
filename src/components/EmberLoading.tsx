import Ember from "@/components/Ember";

// Shown while a slow page loads (commander pages fetch from EDHREC, decks and prices from the database).
export default function EmberLoading({ label }: { label: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-16 text-center" role="status" aria-live="polite">
      <div className="animate-pulse">
        <Ember mood="thinking" size={130} title="Ember, the Mana Forge mascot, thinking" />
      </div>
      <p className="mt-2 text-sm text-muted">{label}</p>
    </div>
  );
}
