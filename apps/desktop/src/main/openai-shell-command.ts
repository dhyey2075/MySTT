/** Natural language → single-line Windows shell via OpenAI Chat Completions. */

export type ShellConvertResult =
  | { ok: true; command: string }
  | { ok: false; deniedByModel: boolean; message: string }

export async function convertNaturalLanguageToShellCommand(params: {
  apiKey: string
  /** Already-polished transcript text */
  userTranscript: string
  signal?: AbortSignal
}): Promise<ShellConvertResult> {
  const trimmed = params.userTranscript.trim()
  if (!trimmed) return { ok: false, deniedByModel: false, message: 'empty transcript' }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.15,
      max_tokens: 220,
      messages: [
        {
          role: 'system',
          content: [
            'You turn spoken natural language into ONE Windows terminal command.',
            'Output ONLY the command: no markdown fences, no quotes wrapping the whole command, no commentary.',
            'Prefer PowerShell when it fits (Get-ChildItem, Set-Location, Select-Object). Use cmd.exe style only when clearly simpler.',
            'Never produce destructive or risky operations: no mass delete/recursive rm/del /f/s, format disk, diskpart, registry wipes, shutdown/reboot, Invoke-Expression/iex, downloading code then executing, piping web requests into shells, clearing disks/recycle bin, EncodedCommand tricks, certutil/bitsadmin abuse.',
            'If the request is unsafe or impossible safely, output exactly: DENY',
          ].join(' '),
        },
        { role: 'user', content: trimmed },
      ],
    }),
    signal: params.signal,
  })

  const raw = await res.text()
  if (!res.ok) {
    return { ok: false, deniedByModel: false, message: raw.slice(0, 400) }
  }

  let json: unknown
  try {
    json = JSON.parse(raw) as unknown
  } catch {
    return { ok: false, deniedByModel: false, message: 'invalid JSON from OpenAI' }
  }

  const choices = (json as { choices?: Array<{ message?: { content?: string | null } }> }).choices
  const content = choices?.[0]?.message?.content
  if (typeof content !== 'string') return { ok: false, deniedByModel: false, message: 'missing assistant message' }

  const command = content.trim()
  if (/^deny$/i.test(command)) {
    return { ok: false, deniedByModel: true, message: 'Refused: unsafe or unclear shell request.' }
  }

  return { ok: true, command }
}
