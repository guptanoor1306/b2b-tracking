'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { ChannelReportPreview } from '@/components/reports/ChannelReportPreview'
import { generateChannelReport } from '@/lib/actions/channel-report'
import {
  REPORT_TIMEFRAMES,
  getReportMonthOptions,
  ChannelReport,
} from '@/lib/reports/channel-report'
import { cn } from '@/lib/utils'
import { FileBarChart } from 'lucide-react'

type Props = {
  open: boolean
  onClose: () => void
}

export function ChannelReportModal({ open, onClose }: Props) {
  const [periodKey, setPeriodKey] = useState('7d')
  const [report, setReport] = useState<ChannelReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const monthOptions = getReportMonthOptions()

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    const result = await generateChannelReport(periodKey)
    setLoading(false)
    if (result.error) {
      setError(result.error)
      setReport(null)
      return
    }
    setReport(result.report ?? null)
  }

  const handleClose = () => {
    onClose()
    setReport(null)
    setError(null)
  }

  const selectPeriod = (key: string) => {
    setPeriodKey(key)
    setReport(null)
    setError(null)
  }

  return (
    <Modal open={open} onClose={handleClose} title="Channel report" size="xl">
      <div className="space-y-5">
        <div className="space-y-3">
          <div>
            <p className="mb-2 text-xs font-medium text-zinc-500">Rolling period</p>
            <div className="flex flex-wrap gap-2">
              {REPORT_TIMEFRAMES.map(option => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => selectPeriod(option.key)}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                    periodKey === option.key
                      ? 'border-violet-300 bg-violet-50 text-violet-800'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {monthOptions.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-zinc-500">By month</p>
              <div className="flex flex-wrap gap-2">
                {monthOptions.map(option => {
                  const key = `month:${option.key}`
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => selectPeriod(key)}
                      className={cn(
                        'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                        periodKey === key
                          ? 'border-violet-300 bg-violet-50 text-violet-800'
                          : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300',
                      )}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <Button onClick={handleGenerate} loading={loading} className="w-full sm:w-auto">
          <FileBarChart size={16} />
          Preview report
        </Button>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {report && (
          <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
            <ChannelReportPreview report={report} />
          </div>
        )}
      </div>
    </Modal>
  )
}

export function CreateReportButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)} className="v2-btn-secondary">
        <FileBarChart size={14} />
        Create Report
      </Button>
      <ChannelReportModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
