export default function BillingLoading() {
  return (
    <div className="flex flex-col gap-2" aria-label="Loading">
      <div className="mb-2 flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex-1 rounded-xl bg-primary p-4 ring-1 ring-secondary">
            <div className="h-4 w-3/5 animate-pulse rounded-md bg-tertiary" />
            <div className="mt-2 h-5 w-2/5 animate-pulse rounded-md bg-tertiary" />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <div className="h-80 flex-5 animate-pulse rounded-xl bg-tertiary" />
        <div className="h-80 flex-7 animate-pulse rounded-xl bg-tertiary" />
      </div>
    </div>
  );
}
