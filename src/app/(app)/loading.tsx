export default function AppLoading() {
  return (
    <div className="space-y-4">
      <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-200">
        <div className="h-full w-1/3 animate-pulse rounded-full bg-violet-500" />
      </div>
      <div className="flex min-h-[30vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
      </div>
    </div>
  )
}
