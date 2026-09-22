export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-2" aria-label="Loading">
      <div className="h-8 w-2/5 animate-pulse rounded-md bg-tertiary" />
      <div className="mb-2 flex gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-21 flex-1 animate-pulse rounded-xl bg-tertiary" />
        ))}
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-16 animate-pulse rounded-xl bg-tertiary" />
      ))}
    </div>
  );
}
