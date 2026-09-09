export default function DashboardLoading() {
  return (
    <div className="theme-v2 -mx-6 -mt-2 min-h-[calc(100vh-4rem)] px-6 pb-10 pt-2">
      <div className="mx-auto max-w-5xl space-y-6 animate-pulse">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-56 rounded-lg bg-zinc-200" />
            <div className="h-4 w-40 rounded bg-zinc-100" />
          </div>
          <div className="h-9 w-32 rounded-lg bg-zinc-100" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-24 rounded-2xl bg-zinc-100" />
          ))}
        </div>
        <div className="h-40 rounded-2xl bg-zinc-100" />
        <div className="h-48 rounded-2xl bg-zinc-100" />
      </div>
    </div>
  )
}
