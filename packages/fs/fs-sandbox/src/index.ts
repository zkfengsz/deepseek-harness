/**
 * `SandboxedFileSystem`: the sandbox-enforcing implementation of the
 * `@deepseek-ai/dsh-fs` Service Definition. It extends `LocalFileSystem` so all
 * text-storage mechanics — resolve, stat, read/stream, list, the atomic
 * write and the read-match-write edit critical section — are the local
 * implementation's, verbatim; this package adds only the per-call POLICY fence:
 * the WRITE fence on the two mutations, and the READ fence on every operation
 * that observes a file, its metadata, or a directory listing.
 *
 * The fence is a policy check in TRUSTED code over a MODEL-CONTROLLED path,
 * NOT a kernel boundary — the operations are the seam's own (open, rename),
 * and only the target path is untrusted, so canonicalize-then-contain is the
 * complete answer to this surface. This is containment, not a security
 * boundary; kernel-grade isolation of untrusted CODE stays `ctx.shell`'s job
 * (`@deepseek-ai/dsh-bash-sandbox`). The residual
 * TOCTOU (an ancestor symlink swapped between the containment re-check and the
 * syscall) is narrowed by re-canonicalizing immediately before delegating and
 * is accepted for this threat model.
 *
 * Per-call policy: `read-only` denies every mutation; `workspace-write` allows
 * a mutation only when the target canonicalizes under the policy's workspace
 * root or a platform temp area from the shared `writableRoots` policy;
 * `danger-full-access` delegates unfenced. Reads are fenced separately and
 * independently of the mode: a deployment that names a read boundary confines
 * every read to the roots `readRootsFor` derives (the calling session's
 * workspace, the deployment's own read roots, and the platform roots a process
 * needs to run), while a deployment that names none leaves reads unchanged. A
 * denial throws the structured `FS_SANDBOX_DENIED`.
 *
 * @module @deepseek-ai/dsh-fs-sandbox
 */

import { basename, dirname, resolve as resolvePath } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { LocalFileSystem } from '@deepseek-ai/dsh-fs-local'
import type { Config as LocalConfig } from '@deepseek-ai/dsh-fs-local'
import { FsError } from '@deepseek-ai/dsh-fs'
import type {
  FsDirEntry,
  FsEditOutcome,
  FsEditRequest,
  FsInfo,
  FsPathInfo,
  FsTarget,
  FsVersion,
  FsWriteIntent,
  FsWriteOutcome,
} from '@deepseek-ai/dsh-fs'
import { canonicalPath, readRootsFor, writableRoots } from '@deepseek-ai/dsh-sandbox'
import type { SandboxExecutionPolicy, SandboxMode } from '@deepseek-ai/dsh-sandbox'
import type {} from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-sandbox-policy'
import { isPathUnder } from './containment.ts'

/**
 * Plugin config: the local backend's knobs verbatim (`cwd` resolution default
 * and `diffBasisMaxBytes` overwrite-presentation bound). The sandbox default
 * (mode + `workspace-write` fallback root) is NOT here — `ctx.sandboxPolicy`
 * resolves each calling session for every enforcing capability.
 */
export type Config = LocalConfig

/**
 * Sandbox-enforcing filesystem backend. Registers as `ctx.fs` (loading it
 * INSTEAD OF `dsh-fs-local`, together with a `ctx.sandboxPolicy`, is the whole
 * swap — the model-facing tools are untouched). Its configured default mode is
 * the capability fact exposed by {@link sandboxMode}; `dsh-tool-fs` resolves
 * each session's mode and cwd into a policy for every mutation, while an
 * approved escalation may stamp a strictly wider mode for one call.
 */
export class SandboxedFileSystem extends LocalFileSystem {
  static inject = ['sandboxPolicy']

  private readonly defaultMode: SandboxMode
  constructor(ctx: Context, config: Config) {
    super(ctx, config)
    this.defaultMode = ctx.sandboxPolicy.defaultMode
  }

  /** The deployment default mode — the capability fact the tool layer reads to advertise escalation. */
  override get sandboxMode(): SandboxMode {
    return this.defaultMode
  }

  /**
   * Fence the write by the per-call policy, then delegate to the inherited
   * atomic write. See {@link checkedTarget}.
   * @param target - the resolved target to write.
   * @param content - the full new file content.
   * @param expected - the write intent guarding the write; omit for unconditional.
   * @param signal - aborts before atomic publication takes effect.
   * @param sandboxPolicy - the per-call mode and workspace root; omit to use
   *   the deployment fallback.
   * @returns the write outcome from the inherited backend.
   */
  override async writeText(
    target: FsTarget,
    content: string,
    expected?: FsWriteIntent,
    signal?: AbortSignal,
    sandboxPolicy?: SandboxExecutionPolicy,
  ): Promise<FsWriteOutcome> {
    return super.writeText(await this.checkedTarget(target, sandboxPolicy), content, expected, signal)
  }

  /**
   * Fence the edit by the per-call policy, then delegate to the inherited
   * atomic edit. See {@link checkedTarget}.
   * @param target - the resolved target to edit.
   * @param edit - the literal search/replace request.
   * @param expected - the version guard; omit for an unconditional edit.
   * @param signal - aborts before atomic publication takes effect.
   * @param sandboxPolicy - the per-call mode and workspace root; omit to use
   *   the deployment fallback.
   * @returns the edit outcome from the inherited backend.
   */
  override async editText(
    target: FsTarget,
    edit: FsEditRequest,
    expected?: { version: FsVersion },
    signal?: AbortSignal,
    sandboxPolicy?: SandboxExecutionPolicy,
  ): Promise<FsEditOutcome> {
    return super.editText(await this.checkedTarget(target, sandboxPolicy), edit, expected, signal)
  }

  /**
   * Fence the target metadata read by the deployment's read boundary, then
   * delegate to the inherited stat. See {@link checkedReadTarget}.
   * @param target - the resolved target to stat.
   * @param signal - aborts the metadata round-trip.
   * @returns metadata only, never content; undefined for an absent target.
   */
  override async stat(target: FsTarget, signal?: AbortSignal): Promise<FsInfo | undefined> {
    return super.stat(await this.checkedReadTarget(target), signal)
  }

  /**
   * Fence the no-follow path inspection by the deployment's read boundary, then
   * delegate to the inherited lstat. See {@link checkedReadPath}.
   * @param path - the path to inspect; relative paths resolve against `opts.cwd`.
   * @param opts - `cwd` overrides the backend's default base for relative paths.
   * @param signal - aborts the metadata round-trip.
   * @returns metadata only, never content; undefined for an absent path.
   */
  override async lstat(path: string, opts?: { cwd?: string }, signal?: AbortSignal): Promise<FsPathInfo | undefined> {
    await this.checkedReadPath(path, opts?.cwd)
    return super.lstat(path, opts, signal)
  }

  /**
   * Fence the whole-file text read by the deployment's read boundary, then
   * delegate to the inherited read. See {@link checkedReadTarget}.
   * @param target - the resolved target to read.
   * @param signal - aborts the read.
   * @returns the full decoded UTF-8 content.
   */
  override async readText(target: FsTarget, signal?: AbortSignal): Promise<string> {
    return super.readText(await this.checkedReadTarget(target), signal)
  }

  /**
   * Fence the streamed text read by the deployment's read boundary, then
   * delegate to the inherited stream. See {@link checkedReadTarget}.
   * @param target - the resolved target to read.
   * @param signal - aborts the stream, including between chunks.
   * @returns the chunk iterable, decoded and validated like `readText`.
   */
  override async streamText(target: FsTarget, signal?: AbortSignal): Promise<AsyncIterable<string>> {
    return super.streamText(await this.checkedReadTarget(target), signal)
  }

  /**
   * Fence the whole-file byte read by the deployment's read boundary, then
   * delegate to the inherited read. See {@link checkedReadTarget}.
   * @param target - the resolved target to read.
   * @param signal - aborts the read.
   * @param maxBytes - inclusive byte cap on the complete content.
   * @returns the full raw content, at most `maxBytes` long.
   */
  override async readBytes(target: FsTarget, signal: AbortSignal | undefined, maxBytes: number): Promise<Uint8Array> {
    return super.readBytes(await this.checkedReadTarget(target), signal, maxBytes)
  }

  /**
   * Fence the byte-window read by the deployment's read boundary, then delegate
   * to the inherited read. See {@link checkedReadTarget}.
   * @param target - the resolved target to read.
   * @param range - `offset`, the 0-based first byte, and `length`, the largest byte count.
   * @param signal - aborts the read.
   * @returns the window's bytes, at most `length` long.
   */
  override async readByteRange(target: FsTarget, range: { offset: number; length: number }, signal?: AbortSignal): Promise<Uint8Array> {
    return super.readByteRange(await this.checkedReadTarget(target), range, signal)
  }

  /**
   * Fence the directory enumeration by the deployment's read boundary, then
   * delegate to the inherited listing. A listing observes child names and
   * metadata, so it is a read of the boundary like any other.
   * See {@link checkedReadTarget}.
   * @param target - the resolved directory target.
   * @param signal - aborts the listing.
   * @returns one entry per direct child, in stable name order.
   */
  override async listDir(target: FsTarget, signal?: AbortSignal): Promise<FsDirEntry[]> {
    return super.listDir(await this.checkedReadTarget(target), signal)
  }

  /**
   * Enforce the per-call policy against `target` and return the EXACT target the
   * mutation must use, so the checked identity is the mutated one (no
   * check-here-write-there TOCTOU). `read-only` denies; `workspace-write`
   * re-canonicalizes NOW (`resolve` realpaths the deepest existing ancestor,
   * reflecting a concurrently swapped symlink), requires containment under a
   * writable root, and returns THAT fresh target; `danger-full-access` returns
   * the caller's target unfenced. Throws the structured `FS_SANDBOX_DENIED` on
   * refusal — the tool layer maps it to the model-facing `[sandbox: …]` marker
   * and the escalation hint.
   */
  private async checkedTarget(target: FsTarget, sandboxPolicy?: SandboxExecutionPolicy): Promise<FsTarget> {
    const policy = sandboxPolicy ?? this.ctx.sandboxPolicy.resolve()
    const { mode } = policy
    if (mode === 'danger-full-access') return target
    if (mode === 'read-only') {
      throw new FsError(`cannot write "${target.displayPath}": file access denied under read-only mode`, 'FS_SANDBOX_DENIED')
    }
    // workspace-write: containment on the FRESH canonical path (catches a
    // symlink ancestor swapped since the tool resolved this target), and the
    // mutation delegates with THIS fresh target — never the stale one.
    const fresh = await this.resolve(target.displayPath)
    let contained = false
    for (const root of writableRoots(policy)) {
      if (await isPathUnder(fresh.targetKey, root)) {
        contained = true
        break
      }
    }
    if (!contained) {
      throw new FsError(`cannot write "${target.displayPath}": file access denied under workspace-write mode`, 'FS_SANDBOX_DENIED')
    }
    return fresh
  }

  /**
   * Enforce the deployment's READ boundary against `target` and return the
   * EXACT target the read must use. The boundary is the calling session's data
   * context: a deployment that names none (`readRootsFor` returns `undefined`)
   * returns the caller's target untouched, which is the behavior every
   * deployment had before a boundary existed. A confined read re-canonicalizes
   * NOW — `resolve` realpaths the deepest existing ancestor, so an ancestor
   * symlink swapped since the tool resolved this target cannot smuggle the read
   * out of the boundary — requires containment under a readable root, and reads
   * THAT fresh target. Throws the structured `FS_SANDBOX_DENIED` naming the
   * boundary on refusal; the tool layer maps it to the model-facing
   * `[sandbox: …]` read marker and the escalation hint.
   */
  private async checkedReadTarget(target: FsTarget): Promise<FsTarget> {
    const roots = this.readRoots()
    if (roots === undefined) return target
    const fresh = await this.resolve(target.displayPath)
    if (await this.underAnyRoot(fresh.targetKey, roots)) return fresh
    throw new FsError(`cannot read "${target.displayPath}": file access denied outside this session's data boundary`, 'FS_SANDBOX_DENIED')
  }

  /**
   * Enforce the deployment's READ boundary against a PATH that is deliberately
   * not followed to its final component (`lstat`) — the same containment check
   * as {@link checkedReadTarget}, except that the last component is observed
   * itself, so the fresh canonical path is the canonical PARENT plus the
   * component as spelled. A link inside the boundary therefore stays
   * inspectable, while an ancestor link swapped after the caller resolved the
   * path cannot move the observation outside the boundary.
   */
  private async checkedReadPath(path: string, cwd?: string): Promise<void> {
    const roots = this.readRoots()
    if (roots === undefined) return
    const lexical = resolvePath(cwd ?? this.config.cwd, path)
    const fresh = resolvePath(canonicalPath(dirname(lexical)), basename(lexical))
    if (await this.underAnyRoot(fresh, roots)) return
    throw new FsError(`cannot read "${path}": file access denied outside this session's data boundary`, 'FS_SANDBOX_DENIED')
  }

  /**
   * The deployment's read allow-list for THIS call, or `undefined` when reads
   * are unconfined. The boundary belongs to a session, so it is resolved from
   * the agent that initiated the current asynchronous chain — the caller the
   * capability seam deliberately does not thread through a read method. An
   * agent-less call (the harness's own machinery, e.g. skill loading) has no
   * session and stays unconfined, exactly as `SandboxPolicyService.resolve`
   * defines it.
   */
  private readRoots(): string[] | undefined {
    const session = this.ctx.get('agents')?.currentInitiator()?.session
    return readRootsFor(this.ctx.sandboxPolicy.resolve(session === undefined ? {} : { session }))
  }

  /** Whether `path` is one of `roots` or lies beneath it. */
  private async underAnyRoot(path: string, roots: readonly string[]): Promise<boolean> {
    for (const root of roots) {
      if (await isPathUnder(path, root)) return true
    }
    return false
  }
}

export default SandboxedFileSystem
