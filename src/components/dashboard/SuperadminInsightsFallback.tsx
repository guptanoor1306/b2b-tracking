export function SuperadminInsightsFallback() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading insights">
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm">
        <div className="mb-4 h-8 w-48 animate-pulse rounded-lg bg-zinc-100" />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-zinc-50" />
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm">
        <div className="mb-3 h-8 w-56 animate-pulse rounded-lg bg-zinc-100" />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-zinc-50" />
          ))}
        </div>
      </div>
    </div>
  )
}
