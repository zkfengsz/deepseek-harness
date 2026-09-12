/**
 * Tests for the sandbox-enforcing filesystem backend: the per-call policy fence
 * on write/edit (read-only denies, workspace-write contains, danger-full-access
 * passes through), the read fence (a deployment that names a read boundary
 * confines every observing operation to it; one that names none leaves reads
 * unchanged), the capability fact, and the containment matrix — `..`
 * traversal, absolute paths outside, and symlink escapes (a symlinked directory
 * inside the workspace pointing out, and a new file created under one). The
 * fence is exercised on a real filesystem: a denied write leaves no file on
 * disk, and a denied read returns no content.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, parse } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import AgentRegistry from '@deepseek-ai/dsh-agent'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { FsError, FsTargetKey } from '@deepseek-ai/dsh-fs'
import type { FsTarget } from '@deepseek-ai/dsh-fs'
import SandboxPolicyService from '@deepseek-ai/dsh-sandbox-policy'
import type { Config as SandboxPolicyConfig } from '@deepseek-ai/dsh-sandbox-policy'
import { SessionId, SessionLogOffset, SessionSeq } from '@deepseek-ai/dsh-session'
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import type { SandboxMode } from '@deepseek-ai/dsh-sandbox'
import { SandboxedFileSystem } from '@deepseek-ai/dsh-fs-sandbox'
import { assertWorkspaceOutsideTemp, outsideTempWorkspaceParent } from '../../../../scripts/snapshot-workspace-parent.ts'

let base: string
let workspace: string
let outside: string
let ctx: Context
let fs: SandboxedFileSystem
let fiber: Awaited<ReturnType<Context['plugin']>>
let agentsFiber: Awaited<ReturnType<Context['plugin']>> | undefined

async function boot(mode: SandboxMode, policy: Pick<SandboxPolicyConfig, 'confineReads' | 'readRoots'> = {}): Promise<void> {
  ctx = new Context()
  await ctx.plugin(SessionProjectionRegistry)
  await ctx.plugin(SandboxPolicyService, { mode, workspaceRoot: workspace, ...policy })
  fiber = await ctx.plugin(SandboxedFileSystem, { cwd: workspace })
  fs = ctx.fs as SandboxedFileSystem
}

/**
 * A confining deployment whose read boundary belongs to a session, plus the
 * agent registry that carries the initiating agent. The session carries the
 * minimal log surface `ctx.sandboxPolicy.resolve` folds the mode override from.
 */
async function bootReadConfined(): Promise<void> {
  await boot('workspace-write', { confineReads: true })
  agentsFiber = await ctx.plugin(AgentRegistry)
}

/** The session the confined reads belong to: its cwd is the workspace. */
function callingAgent(cwd = workspace): Agent {
  const id = SessionId('sess-fs-read')
  const events = [{ type: 'turn/start', seq: SessionSeq(0), time: 0, data: { turn: 1 } }]
  return {
    id,
    session: {
      id,
      header: { version: 0, id, createdAt: 0, cwd, isSeeded: false },
      inheritedEventCount: SessionLogOffset(0),
      firstLiveSeq: SessionLogOffset(0),
      seq: SessionLogOffset(events.length),
      eventAt: (seq: number) => events[seq],
      snapshotEvents: (fromSeq = 0, toSeqExclusive = events.length) => events.slice(fromSeq, toSeqExclusive),
      append: () => { throw new Error('the read-fence fixture never appends') },
    },
  } as unknown as Agent
}

/** Run one operation as the initiating agent (the boundary a read is resolved against). */
function asCaller<T>(operation: () => Promise<T>, cwd = workspace): Promise<T> {
  return ctx.agents.withInitiator(callingAgent(cwd), operation)
}

beforeEach(async ({ onTestFinished }) => {
  // Both siblings must be outside automatic temp grants for containment denials to be meaningful.
  const directory = await mkdtemp(join(outsideTempWorkspaceParent(), '.dsh-fssbx-'))
  onTestFinished(async () => { await rm(directory, { recursive: true, force: true }) })
  base = directory
  assertWorkspaceOutsideTemp(base)
  workspace = join(base, 'ws')
  outside = join(base, 'out')
  await mkdir(workspace)
  await mkdir(outside)
})
afterEach(async () => {
  await agentsFiber?.dispose()
  agentsFiber = undefined
  await fiber?.dispose()
})

/** Resolve a path through the backend and return its target. */
function target(path: string): Promise<FsTarget> {
  return fs.resolve(path)
}

describe('the capability fact', () => {
  it('reports the deployment default mode (what the tool layer advertises against)', async () => {
    await boot('workspace-write')
    expect(fs.sandboxMode).toBe('workspace-write')
  })
})

describe('read-only', () => {
  beforeEach(() => boot('read-only'))

  it('denies write, leaving no file on disk', async () => {
    const path = join(workspace, 'denied.txt')
    await expect(fs.writeText(await target(path), 'x')).rejects.toMatchObject({ code: 'FS_SANDBOX_DENIED' })
    expect(existsSync(path)).toBe(false)
  })

  it('denies edit of an existing file (the content is unchanged)', async () => {
    const path = join(workspace, 'file.txt')
    await writeFile(path, 'original')
    await expect(fs.editText(await target(path), { oldString: 'original', newString: 'changed', replaceAll: false }))
      .rejects.toMatchObject({ code: 'FS_SANDBOX_DENIED' })
    expect(await readFile(path, 'utf8')).toBe('original')
  })

  it('allows reads (every mode permits reading)', async () => {
    const path = join(workspace, 'readable.txt')
    await writeFile(path, 'hello')
    expect(await fs.readText(await target(path))).toBe('hello')
  })
})

describe('workspace-write containment', () => {
  beforeEach(() => boot('workspace-write'))

  it('a write under the workspace lands', async () => {
    const path = join(workspace, 'nested', 'ok.txt')
    const outcome = await fs.writeText(await target(path), 'inside')
    expect(outcome.operation).toBe('create')
    expect(await readFile(path, 'utf8')).toBe('inside')
  })

  it('a write to the platform temp area lands (parity with the bash runner grant)', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-fssbx-tmp-'))
    try {
      const path = join(dir, 'temp.txt')
      await fs.writeText(await target(path), 'temp')
      expect(await readFile(path, 'utf8')).toBe('temp')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('an absolute path outside the workspace is denied, no file created', async () => {
    const path = join(outside, 'escape.txt')
    await expect(fs.writeText(await target(path), 'x')).rejects.toMatchObject({ code: 'FS_SANDBOX_DENIED' })
    expect(existsSync(path)).toBe(false)
  })

  it('a `..` traversal out of the workspace is denied', async () => {
    const path = join(workspace, '..', 'sibling-escape.txt')
    await expect(fs.writeText(await target(path), 'x')).rejects.toMatchObject({ code: 'FS_SANDBOX_DENIED' })
    expect(existsSync(join(workspace, '..', 'sibling-escape.txt'))).toBe(false)
  })

  it('a symlinked directory inside the workspace pointing OUT is denied (canonicalized before containment)', async () => {
    // workspace/link -> outside ; writing workspace/link/f.txt would land in outside/f.txt.
    await symlink(outside, join(workspace, 'link'))
    const path = join(workspace, 'link', 'f.txt')
    await expect(fs.writeText(await target(path), 'x')).rejects.toMatchObject({ code: 'FS_SANDBOX_DENIED' })
    expect(existsSync(join(outside, 'f.txt'))).toBe(false)
  })

  it('a NEW file created under a symlinked-out directory is denied (deepest-ancestor realpath)', async () => {
    await symlink(outside, join(workspace, 'link'))
    const path = join(workspace, 'link', 'newdir', 'deep.txt')
    await expect(fs.writeText(await target(path), 'x')).rejects.toMatchObject({ code: 'FS_SANDBOX_DENIED' })
    expect(existsSync(join(outside, 'newdir'))).toBe(false)
  })

  it('an edit outside the workspace is denied; the original is untouched', async () => {
    const path = join(outside, 'file.txt')
    await writeFile(path, 'original')
    await expect(fs.editText(await target(path), { oldString: 'original', newString: 'x', replaceAll: false }))
      .rejects.toMatchObject({ code: 'FS_SANDBOX_DENIED' })
    expect(await readFile(path, 'utf8')).toBe('original')
  })

  it('an edit inside the workspace lands', async () => {
    const path = join(workspace, 'edit.txt')
    await writeFile(path, 'original')
    const outcome = await fs.editText(await target(path), { oldString: 'original', newString: 'changed', replaceAll: false })
    expect(outcome.after).toBe('changed')
    expect(await readFile(path, 'utf8')).toBe('changed')
  })

  it('mutates the freshly checked identity, not a stale outside targetKey (TOCTOU direction)', async () => {
    // A target whose displayPath is inside the workspace but whose targetKey is
    // a STALE outside path — as if an ancestor symlink pointed out at the tool's
    // resolve() and was swapped in before the write. The fence re-resolves
    // displayPath (now inside) AND delegates with that fresh target, so the byte
    // lands inside and the stale outside path is never written.
    const insidePath = join(workspace, 'landed.txt')
    const staleTarget: FsTarget = { displayPath: insidePath, targetKey: FsTargetKey(join(outside, 'escaped.txt')) }
    await fs.writeText(staleTarget, 'inside')
    expect(await readFile(insidePath, 'utf8')).toBe('inside')
    expect(existsSync(join(outside, 'escaped.txt'))).toBe(false)
  })

  it('the workspace root itself passes the fence (path equal to a writable root), failing only on file type', async () => {
    // isUnder's path-equals-root branch: the fence allows the root, and the
    // write then fails because the root is a directory, not a regular file.
    await expect(fs.writeText(await target(workspace), 'x')).rejects.toMatchObject({ code: 'FS_NOT_REGULAR_FILE' })
  })
})

describe('workspace-write with the filesystem root as the workspace (a root ending in the path separator)', () => {
  it('grants writes anywhere on that volume', async () => {
    // A degenerate but valid config: the filesystem root containing the target.
    // It exercises the separator-suffixed-root branch on POSIX and Windows.
    const rootCtx = new Context()
    await rootCtx.plugin(SessionProjectionRegistry)
    await rootCtx.plugin(SandboxPolicyService, { mode: 'workspace-write', workspaceRoot: parse(base).root })
    const rootFiber = await rootCtx.plugin(SandboxedFileSystem, { cwd: workspace })
    const rootFs = rootCtx.fs as SandboxedFileSystem
    try {
      const path = join(base, 'anywhere.txt') // outside temp — allowed only via the filesystem root
      await rootFs.writeText(await rootFs.resolve(path), 'anywhere')
      expect(await readFile(path, 'utf8')).toBe('anywhere')
    } finally {
      await rootFiber.dispose()
    }
  })
})

describe('danger-full-access', () => {
  beforeEach(() => boot('danger-full-access'))

  it('writes anywhere, unfenced', async () => {
    const path = join(outside, 'free.txt')
    await fs.writeText(await target(path), 'free')
    expect(await readFile(path, 'utf8')).toBe('free')
  })
})

describe('the per-call policy override (escalation)', () => {
  it('a workspace-write stamp on a read-only default lets a contained write land for that call only', async () => {
    await boot('read-only')
    const path = join(workspace, 'escalated.txt')
    // Default read-only would deny; the per-call workspace-write policy allows it (contained).
    await fs.writeText(await target(path), 'granted', undefined, undefined, { mode: 'workspace-write', workspaceRoot: workspace })
    expect(await readFile(path, 'utf8')).toBe('granted')
    // A neighboring plain call still runs under the read-only default.
    await expect(fs.writeText(await target(join(workspace, 'plain.txt')), 'x'))
      .rejects.toMatchObject({ code: 'FS_SANDBOX_DENIED' })
  })

  it('a danger-full-access stamp bypasses the fence for that call', async () => {
    await boot('read-only')
    const path = join(outside, 'granted-full.txt')
    await fs.writeText(await target(path), 'full', undefined, undefined, { mode: 'danger-full-access', workspaceRoot: workspace })
    expect(await readFile(path, 'utf8')).toBe('full')
  })
})

describe('registration and HMR safety', () => {
  it('registers as ctx.fs and unregisters cleanly from a child fiber', async () => {
    await boot('workspace-write')
    expect(ctx.fs).toBeInstanceOf(SandboxedFileSystem)
    await fiber.dispose()
    expect(ctx.get('fs')).toBeUndefined()
    // Re-mount below the disposed one to prove no lingering registration.
    fiber = await ctx.plugin(SandboxedFileSystem, { cwd: workspace })
    expect(ctx.fs).toBeInstanceOf(SandboxedFileSystem)
  })
})

describe('FsError identity', () => {
  it('the denial is a structured FsError distinct from a host permission error', async () => {
    await boot('read-only')
    const error = await fs.writeText(await target(join(workspace, 'x.txt')), 'x').catch((e: unknown) => e as object)
    expect(error).toBeInstanceOf(FsError)
    expect((error as FsError).code).toBe('FS_SANDBOX_DENIED')
  })
})

/** The denial the read fence throws, as the model-facing tool layer receives it. */
function readDenied(): object {
  const message = expect.stringContaining("outside this session's data boundary") as unknown as string
  return { code: 'FS_SANDBOX_DENIED', message }
}

describe('reads without a named boundary', () => {
  it('reads outside the workspace unchanged (no boundary configured)', async () => {
    await boot('workspace-write')
    const path = join(outside, 'plain.txt')
    await writeFile(path, 'readable')
    expect(await fs.readText(await target(path))).toBe('readable')
  })

  it('inspects a path outside the workspace unchanged (lstat without a boundary)', async () => {
    await boot('workspace-write')
    const path = join(outside, 'probed.txt')
    await writeFile(path, 'probed')
    expect(await fs.lstat(path)).toMatchObject({ type: 'file' })
  })
})

describe('the read boundary (a deployment that confines reads)', () => {
  beforeEach(bootReadConfined)

  it('reads a file inside the boundary', async () => {
    const path = join(workspace, 'inside.txt')
    await writeFile(path, 'inside')
    expect(await asCaller(async () => fs.readText(await fs.resolve(path)))).toBe('inside')
  })

  it('denies a read outside the boundary, naming the boundary and returning no content', async () => {
    const path = join(outside, 'secret.txt')
    await writeFile(path, 'secret')
    const error = await asCaller(async () => fs.readText(await fs.resolve(path))).catch((e: unknown) => e as object)
    expect(error).toMatchObject(readDenied())
    expect(error).toBeInstanceOf(FsError)
  })

  it('reads a configured deployment read root outside the workspace', async () => {
    const deploy = join(base, 'deploy')
    await mkdir(deploy)
    await writeFile(join(deploy, 'skill.md'), 'skill')
    await boot('workspace-write', { confineReads: true, readRoots: [deploy] })
    agentsFiber = await ctx.plugin(AgentRegistry)
    expect(await asCaller(async () => fs.readText(await fs.resolve(join(deploy, 'skill.md'))))).toBe('skill')
  })

  it('leaves agentless reads unconfined (the harness reads its own machinery)', async () => {
    const path = join(outside, 'harness.txt')
    await writeFile(path, 'harness')
    expect(await fs.readText(await fs.resolve(path))).toBe('harness')
  })

  it('confines every observing operation outside the boundary', async () => {
    const file = join(outside, 'observed.txt')
    await writeFile(file, 'observed')
    const directory = join(outside, 'listing')
    await mkdir(directory)
    await writeFile(join(directory, 'child.txt'), 'child')
    const fileTarget = await fs.resolve(file)
    const dirTarget = await fs.resolve(directory)
    await expect(asCaller(() => fs.stat(fileTarget))).rejects.toMatchObject(readDenied())
    await expect(asCaller(async () => fs.streamText(await fs.resolve(file)))).rejects.toMatchObject(readDenied())
    await expect(asCaller(() => fs.readBytes(fileTarget, undefined, 1024))).rejects.toMatchObject(readDenied())
    await expect(asCaller(() => fs.readByteRange(fileTarget, { offset: 0, length: 2 }))).rejects.toMatchObject(readDenied())
    await expect(asCaller(() => fs.listDir(dirTarget))).rejects.toMatchObject(readDenied())
  })

  it('confines the no-follow path inspection outside the boundary, and allows a link inside it', async () => {
    const file = join(outside, 'probed.txt')
    await writeFile(file, 'probed')
    // workspace/out-link -> outside : the link is observed itself, so reading its
    // own metadata stays inside the boundary while the path it names does not.
    await symlink(outside, join(workspace, 'out-link'))
    await expect(asCaller(() => fs.lstat(file))).rejects.toMatchObject(readDenied())
    await expect(asCaller(() => fs.lstat(join(workspace, 'out-link')))).resolves.toMatchObject({ type: 'symlink' })
    await expect(asCaller(() => fs.lstat('inside-link', { cwd: workspace }))).resolves.toBeUndefined()
  })

  it('denies a read through a symlinked ancestor pointing out of the boundary', async () => {
    const path = join(outside, 'through-link.txt')
    await writeFile(path, 'escaped')
    await symlink(outside, join(workspace, 'link'))
    await expect(asCaller(async () => fs.readText(await fs.resolve(join(workspace, 'link', 'through-link.txt')))))
      .rejects.toMatchObject(readDenied())
  })

  it('denies a read whose ancestor was swapped for an outside link after the caller resolved it', async () => {
    const swapped = join(workspace, 'swapped')
    await mkdir(swapped)
    const target = await fs.resolve(join(swapped, 'victim.txt'))
    // The caller resolved an in-workspace path; the ancestor is replaced by a
    // link out before the read, and the fence canonicalizes again.
    await rm(swapped, { recursive: true })
    await writeFile(join(outside, 'victim.txt'), 'victim')
    await symlink(outside, swapped)
    await expect(asCaller(() => fs.readText(target))).rejects.toMatchObject(readDenied())
    expect(await readFile(join(outside, 'victim.txt'), 'utf8')).toBe('victim')
  })

  it('reads a file that a symlink inside the boundary points AT (the read follows into the root)', async () => {
    const inner = join(workspace, 'inner.txt')
    await writeFile(inner, 'inner')
    await symlink(inner, join(workspace, 'inner-link'))
    expect(await asCaller(async () => fs.readText(await fs.resolve(join(workspace, 'inner-link'))))).toBe('inner')
    expect(await asCaller(async () => fs.listDir(await fs.resolve(workspace)))).toHaveLength(2)
  })
})
