export default function Loading() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3" aria-label="Loading">
      <div className="size-10 animate-spin rounded-full border-2 border-secondary border-t-brand-solid" />
      <p className="text-sm text-tertiary">Loading…</p>
    </div>
  );
}
