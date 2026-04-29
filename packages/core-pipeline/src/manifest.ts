import { readFileSync } from 'node:fs'

import { z } from 'zod'

export const BinaryArtifactSchema = z
  .object({
    url: z.string().url(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/i),
    sizeBytes: z.number().int().nonnegative(),
    /** Plain binary vs archive extraction */
    format: z.enum(['binary', 'zip']).default('binary'),
    /** Single file inside zip → dest exe path (e.g. ffmpeg). Omit if extractZipDirectoryPrefix is set. */
    extractExeRelativePath: z.string().optional(),
    /**
     * Copy every file under this zip path into the bin directory (dirname of dest exe).
     * Use for Windows whisper builds where whisper-cli.exe loads DLLs from the same folder.
     */
    extractZipDirectoryPrefix: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.format !== 'zip') return
    if (data.extractZipDirectoryPrefix || data.extractExeRelativePath) return
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'zip artifacts require extractExeRelativePath or extractZipDirectoryPrefix',
    })
  })

export type BinaryArtifact = z.infer<typeof BinaryArtifactSchema>

export const ModelArtifactSchema = z.object({
  url: z.string().url(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/i),
  sizeBytes: z.number().int().nonnegative(),
})

export type ModelArtifact = z.infer<typeof ModelArtifactSchema>

export const PlatformBinariesSchema = z.object({
  ffmpeg: BinaryArtifactSchema,
  whisper: BinaryArtifactSchema,
})

export type PlatformBinaries = z.infer<typeof PlatformBinariesSchema>

export const RuntimeManifestSchema = z.object({
  version: z.number().int().positive(),
  targets: z.record(z.string(), PlatformBinariesSchema),
  models: z.record(z.enum(['tiny', 'base', 'small']), ModelArtifactSchema),
})

export type RuntimeManifest = z.infer<typeof RuntimeManifestSchema>

export function parseRuntimeManifest(raw: unknown): RuntimeManifest {
  return RuntimeManifestSchema.parse(raw)
}

/** Load manifest JSON from disk (Electron main passes resolved path next to bundle). */
export function loadRuntimeManifestFromPath(path: string): RuntimeManifest {
  const raw: unknown = JSON.parse(readFileSync(path, 'utf8'))
  return parseRuntimeManifest(raw)
}
