/** Read and cache `workbro.app.yml` application manifests for Workspace directories. */
import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { parse } from 'yaml'
import type { WorkbroAppManifest } from './types.ts'

/** Optional non-empty string field of an unvalidated manifest value. */
function optionalString(value: unknown, key: string): string | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const field = (value as Record<string, unknown>)[key]
  return typeof field === 'string' && field !== '' ? field : undefined
}

/** Validate an untyped YAML document into an app manifest, or undefined. */
function parseManifest(value: unknown): WorkbroAppManifest | undefined {
  const name = optionalString(value, 'name')
  const icon = optionalString(value, 'icon')
  const description = optionalString(value, 'description')
  const preset = optionalString(value, 'preset')
  if (name === undefined && icon === undefined && description === undefined && preset === undefined) {
    return undefined
  }
  return { name, icon, description, preset }
}

interface CacheEntry {
  mtimeMs: number
  manifest: WorkbroAppManifest | undefined
}

const cache = new Map<string, CacheEntry>()

/**
 * Read one Workspace's application manifest, cached by modification time.
 * @param dir - Workspace directory path.
 * @returns the parsed manifest, or undefined when absent or malformed.
 */
export async function readAppManifest(dir: string): Promise<WorkbroAppManifest | undefined> {
  const file = join(dir, 'workbro.app.yml')
  try {
    const info = await stat(file)
    const cached = cache.get(file)
    if (cached !== undefined && cached.mtimeMs === info.mtimeMs) return cached.manifest
    const raw = await readFile(file, 'utf8')
    const manifest = parseManifest(parse(raw))
    cache.set(file, { mtimeMs: info.mtimeMs, manifest })
    return manifest
  } catch {
    cache.set(file, { mtimeMs: -1, manifest: undefined })
    return undefined
  }
}
