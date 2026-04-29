import { useCallback, useState } from 'react'

export type DictationLogEntry = {
  id: string
  at: number
  preview: string
  ok: boolean
}

export function useDictationLog(max = 12) {
  const [entries, setEntries] = useState<DictationLogEntry[]>([])

  const push = useCallback(
    (preview: string, ok: boolean) => {
      const id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`
      setEntries((prev) =>
        [{ id, at: Date.now(), preview, ok }, ...prev].slice(0, max)
      )
    },
    [max]
  )

  return { entries, push }
}
