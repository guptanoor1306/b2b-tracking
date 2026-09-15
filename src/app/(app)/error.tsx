'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/Button'

type Props = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function AppError({ error, reset }: Props) {
  useEffect(() => {
    console.error('[app error]', error.digest ?? error.message)
  }, [error])

  return (
    <div className="theme-v2 mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="text-lg font-semibold text-zinc-900">Something went wrong loading this page</h1>
      <p className="mt-2 text-sm text-zinc-500">
        This is usually a temporary server or database hiccup—not your internet. Try again in a moment.
      </p>
      {error.digest && (
        <p className="mt-3 text-[11px] text-zinc-400 font-mono">Ref: {error.digest}</p>
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button onClick={() => reset()}>Try again</Button>
        <Button variant="secondary" onClick={() => { window.location.href = '/studios' }}>
          All channels
        </Button>
      </div>
    </div>
  )
}
