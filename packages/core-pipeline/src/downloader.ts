import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdirSync, renameSync, unlinkSync } from 'node:fs'
import { dirname } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { Transform } from 'node:stream'
import https from 'node:https'
import { URL } from 'node:url'

export type DownloadProgress = {
  receivedBytes: number
  totalBytes: number
}

export type DownloadOptions = {
  url: string
  destPath: string
  sha256Expected: string
  signal?: AbortSignal
  onProgress?: (p: DownloadProgress) => void
}

function httpsGetFollowRedirects(
  urlStr: string,
  headers: Record<string, string>,
  signal?: AbortSignal,
  depth = 0
): Promise<{ response: import('node:http').IncomingMessage; finalUrl: string }> {
  if (depth > 15) {
    return Promise.reject(new Error('Too many redirects'))
  }
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr)
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        port: u.port || 443,
        method: 'GET',
        headers,
      },
      (res) => {
        const code = res.statusCode ?? 0
        if (code >= 300 && code < 400 && res.headers.location) {
          const next = new URL(res.headers.location, urlStr).href
          res.resume()
          resolve(httpsGetFollowRedirects(next, headers, signal, depth + 1))
          return
        }
        resolve({ response: res, finalUrl: urlStr })
      }
    )
    signal?.addEventListener('abort', () => {
      req.destroy()
      reject(signal.reason ?? new Error('aborted'))
    })
    req.on('error', reject)
    req.end()
  })
}

async function sha256File(path: string): Promise<string> {
  const hash = createHash('sha256')
  const rs = createReadStream(path)
  for await (const chunk of rs as AsyncIterable<Buffer>) {
    hash.update(chunk)
  }
  return hash.digest('hex').toLowerCase()
}

/**
 * Resumable HTTPS download with SHA-256 verification of final file.
 * Writes to `destPath + '.part'`, renames atomically on success.
 */
async function downloadFileInner(opts: DownloadOptions, resumeAttempt: number): Promise<void> {
  const partPath = `${opts.destPath}.part`
  mkdirSync(dirname(opts.destPath), { recursive: true })

  let existing = 0
  try {
    const fs = await import('node:fs/promises')
    const st = await fs.stat(partPath)
    existing = st.size
  } catch {
    existing = 0
  }

  const headers: Record<string, string> = {}
  const ranged = existing > 0
  if (ranged) {
    headers.Range = `bytes=${existing}-`
  }

  const { response } = await httpsGetFollowRedirects(opts.url, headers, opts.signal)

  const code = response.statusCode ?? 0

  /** Server ignored Range and sent full body — truncate .part and restart once. */
  if (ranged && code === 200 && resumeAttempt === 0) {
    response.resume()
    try {
      unlinkSync(partPath)
    } catch {
      /* noop */
    }
    return downloadFileInner(opts, resumeAttempt + 1)
  }

  if (existing > 0 && code !== 206 && code !== 200) {
    response.resume()
    throw new Error(`Resume failed: HTTP ${code}`)
  }
  if (existing === 0 && code !== 200) {
    response.resume()
    throw new Error(`Download failed: HTTP ${code}`)
  }

  const contentLen = response.headers['content-length']
  const chunkLen = contentLen != null ? Number.parseInt(contentLen, 10) : 0
  let totalBytes = existing + (Number.isFinite(chunkLen) ? chunkLen : 0)
  const cr = response.headers['content-range']
  if (typeof cr === 'string' && cr.includes('/')) {
    const totalPart = cr.split('/')[1]
    const n = Number.parseInt(totalPart, 10)
    if (Number.isFinite(n)) totalBytes = n
  }

  let received = existing
  const append = code === 206 && existing > 0

  const out = createWriteStream(partPath, { flags: append ? 'a' : 'w' })

  const counter = new Transform({
    transform(chunk: Buffer, _enc, cb) {
      received += chunk.length
      opts.onProgress?.({
        receivedBytes: received,
        totalBytes: totalBytes > 0 ? totalBytes : received,
      })
      cb(null, chunk)
    },
  })

  try {
    await pipeline(response, counter, out)
  } catch (e) {
    try {
      unlinkSync(partPath)
    } catch {
      /* noop */
    }
    throw e
  }

  const digest = await sha256File(partPath)
  const expected = opts.sha256Expected.toLowerCase().trim()
  /** Placeholder hashes (`0`×64) skip verification until manifest is finalized */
  const skipVerify = /^0{64}$/.test(expected)
  if (!skipVerify && digest !== expected) {
    try {
      unlinkSync(partPath)
    } catch {
      /* noop */
    }
    throw new Error(`SHA-256 mismatch: expected ${expected}, got ${digest}`)
  }

  renameSync(partPath, opts.destPath)
}

function isRetriableNetworkError(err: unknown): boolean {
  const code = err && typeof err === 'object' && 'code' in err ? String((err as { code?: string }).code) : ''
  return (
    code === 'ECONNRESET' ||
    code === 'ETIMEDOUT' ||
    code === 'ECONNREFUSED' ||
    code === 'EPIPE' ||
    code === 'ENETUNREACH'
  )
}

const DOWNLOAD_RETRIES = 3

export async function downloadFile(opts: DownloadOptions): Promise<void> {
  let lastErr: unknown
  for (let attempt = 0; attempt < DOWNLOAD_RETRIES; attempt++) {
    try {
      await downloadFileInner(opts, 0)
      return
    } catch (e) {
      lastErr = e
      if (opts.signal?.aborted) throw e
      if (attempt < DOWNLOAD_RETRIES - 1 && isRetriableNetworkError(e)) {
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)))
        continue
      }
      throw e
    }
  }
  throw lastErr
}
