export function BoardLoadingSkeleton() {
  return (
    <div className="theme-v2 -mx-6 -mt-2 min-h-[calc(100vh-4rem)] px-6 pb-10 pt-2">
      <div className="animate-pulse space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-52 rounded-lg bg-zinc-200" />
            <div className="h-4 w-36 rounded bg-zinc-100" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-28 rounded-lg bg-zinc-100" />
            <div className="h-9 w-24 rounded-lg bg-zinc-100" />
          </div>
        </div>
        <div className="h-10 w-full max-w-3xl rounded-lg bg-zinc-100" />
        <div className="flex gap-3 overflow-hidden pt-2">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="w-72 shrink-0 space-y-2">
              <div className="h-6 w-32 rounded bg-zinc-200" />
              <div className="h-24 rounded-xl bg-zinc-100" />
              <div className="h-24 rounded-xl bg-zinc-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
