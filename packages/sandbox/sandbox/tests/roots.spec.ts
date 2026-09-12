/**
 * Tests for the allow-list derivations: the write mode's meaning and the read
 * boundary's, each as a canonical set. Pinned here so the fs fence and the
 * kernel profiles — both deriving from these — cannot drift.
 */

import { mkdtempSync, realpathSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { canonicalPath, readRootsFor, systemReadRoots, writableRoots } from '@deepseek-ai/dsh-sandbox'

/** Every temp root created by this file, removed after each test. */
const roots: string[] = []
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('canonicalPath', () => {
  it('resolves symlinks (an existing path realpaths)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'dsh-roots-'))
    roots.push(dir)
    expect(canonicalPath(dir)).toBe(realpathSync.native(dir))
  })

  it('returns the spelling as-is when the path cannot be resolved (conservative — matches nothing until it exists)', () => {
    expect(canonicalPath('/does/not/exist/anywhere-xyz')).toBe('/does/not/exist/anywhere-xyz')
  })
})

describe('writableRoots', () => {
  it('read-only grants nothing', () => {
    expect(writableRoots({ mode: 'read-only', workspaceRoot: process.cwd() })).toEqual([])
  })

  it('workspace-write grants the workspace root plus the platform temp areas, canonical and deduplicated', () => {
    const ws = mkdtempSync(join(tmpdir(), 'dsh-ws-'))
    roots.push(ws)
    const writable = writableRoots({ mode: 'workspace-write', workspaceRoot: ws })
    expect(writable).toContain(realpathSync.native(ws))
    expect(writable).toContain(canonicalPath('/tmp'))
    expect(writable).toContain(realpathSync.native(tmpdir()))
    // Deduplicated after canonicalization (/tmp and os.tmpdir() may coincide).
    expect(new Set(writable).size).toBe(writable.length)
  })
})

describe('readRootsFor', () => {
  it('leaves reads unconfined when the policy names no boundary', () => {
    // Absence is the open end: every policy that predates the boundary keeps
    // reading what it always could.
    expect(readRootsFor({ mode: 'workspace-write', workspaceRoot: process.cwd() })).toBeUndefined()
  })

  it('confines reads to the workspace, the named roots, and the platform roots', () => {
    const ws = mkdtempSync(join(tmpdir(), 'dsh-ws-'))
    const extra = mkdtempSync(join(tmpdir(), 'dsh-skills-'))
    roots.push(ws, extra)

    const readable = readRootsFor({ mode: 'workspace-write', workspaceRoot: ws, readRoots: [extra] }) as string[]

    expect(readable).toContain(realpathSync.native(ws))
    expect(readable).toContain(realpathSync.native(extra))
    for (const system of systemReadRoots()) expect(readable).toContain(system)
    expect(new Set(readable).size).toBe(readable.length)
  })

  it('an empty boundary still reads the workspace and the platform — a shell cannot start otherwise', () => {
    const ws = mkdtempSync(join(tmpdir(), 'dsh-ws-'))
    roots.push(ws)

    const readable = readRootsFor({ mode: 'workspace-write', workspaceRoot: ws, readRoots: [] }) as string[]

    expect(readable).toContain(realpathSync.native(ws))
    expect(readable.length).toBeGreaterThan(1)
  })
})

describe('systemReadRoots', () => {
  it('names canonical, deduplicated roots and no temp area', () => {
    const system = systemReadRoots()
    expect(system.length).toBeGreaterThan(0)
    expect(new Set(system).size).toBe(system.length)
    // A temp area is a WRITE grant, not a platform requirement; adding it here
    // would widen every boundary by the machine's scratch space.
    expect(system).not.toContain(canonicalPath(tmpdir()))
  })
})
