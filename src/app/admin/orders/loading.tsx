export default function OrdersLoading() {
  return (
    <div className="flex flex-col gap-2" aria-label="Loading">
      <div className="h-8 w-40 animate-pulse rounded-md bg-tertiary" />
      <div className="mb-2 h-5 w-3/5 animate-pulse rounded-md bg-tertiary" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl bg-primary p-4 ring-1 ring-secondary">
          <div className="h-5 w-2/5 animate-pulse rounded-md bg-tertiary" />
          <div className="mt-2 h-4 w-1/4 animate-pulse rounded-md bg-tertiary" />
        </div>
      ))}
    </div>
  );
}
