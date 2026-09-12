/**
 * The allow-list derivations shared by every enforcement dialect that
 * expresses a mode as a canonical set: `workspace-write` means "the workspace
 * root plus the platform temp areas" for WRITES, and {@link readRootsFor} is
 * the separate READ boundary a data-boundary policy adds. The Seatbelt profile
 * (`@deepseek-ai/dsh-sandbox-local`) and the in-process filesystem fence
 * (`@deepseek-ai/dsh-fs-sandbox`) both derive their allow-list here, so "the
 * write tool cannot write /tmp but bash can" asymmetries cannot arise between
 * them. The bwrap and Landlock dialects keep their own grant spellings (an
 * ephemeral `/tmp` mount, launcher-owned flags) — the honest per-runner
 * differences recorded in the sandbox RFC — with parity pinned by test.
 *
 * @module dsh-sandbox/roots
 */

import { realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import type { SandboxExecutionPolicy } from './index.ts'

/**
 * Resolve a granted root to the path the enforcement layer actually compares:
 * canonical (symlinks resolved), because both Seatbelt filters and the fs
 * fence's containment check match resolved paths — `/tmp` IS `/private/tmp`
 * on darwin, and an as-spelled grant would match nothing.
 * @param path - the root as configured or platform-reported.
 * @returns the canonical path, or the spelling as-is when resolution fails
 *   (a missing root matches nothing until it exists — the conservative
 *   outcome; inventing a fallback would grant a path the caller never named).
 */
export function canonicalPath(path: string): string {
  try {
    // Node's JavaScript realpath implementation lexically collapses `..`
    // before resolving a preceding symlink on some platforms. The native
    // implementation follows the filesystem's component-by-component lookup,
    // matching chdir/spawn and the enforcement layers this identity feeds.
    return realpathSync.native(path)
  } catch {
    // realpathSync.native failed: the path (or a prefix) is missing or unreadable.
    return path
  }
}

/**
 * The roots one confined execution may WRITE under — the mode's meaning as a
 * canonical, deduplicated allow-list. `read-only` allows nothing;
 * `workspace-write` allows the policy's workspace root, the host `/tmp`, and
 * the per-user platform temp dir (`os.tmpdir()` — the real temp area for
 * mkstemp-family tools; omitting it would deny what the mode promises).
 * @param policy - the file-effect policy to derive the allow-list from.
 * @returns the canonical writable roots; empty exactly under `read-only`.
 */
export function writableRoots(policy: SandboxExecutionPolicy): string[] {
  if (policy.mode !== 'workspace-write') return []
  return [...new Set([policy.workspaceRoot, '/tmp', tmpdir()].map(canonicalPath))]
}

/**
 * Roots a confined process must read to run at all, independent of what the
 * deployment grants as data: the dynamic loader, the system libraries, and the
 * device and configuration nodes a shell startup touches. These are the
 * KERNEL's requirement, not a policy choice, which is why they are fixed here
 * rather than configured — a deployment's own toolchain (a Homebrew or nvm
 * `node`) varies per machine and belongs in the policy's read roots instead.
 *
 * Shared by the in-process fence and the kernel dialects for the same reason
 * as {@link writableRoots}: a read the filesystem tool allows and bash refuses,
 * or the reverse, would make the boundary unstatable.
 * @returns the canonical platform roots every confined read still reaches.
 */
export function systemReadRoots(): string[] {
  const roots = process.platform === 'darwin'
    ? ['/usr', '/bin', '/sbin', '/System', '/Library', '/private/etc', '/private/var/db', '/private/var/run', '/dev', '/opt/homebrew']
    : ['/usr', '/bin', '/sbin', '/lib', '/lib64', '/etc', '/dev', '/proc', '/sys']
  return [...new Set(roots.map(canonicalPath))]
}

/**
 * The roots one confined execution may READ, or `undefined` when reads are not
 * confined. A data-boundary policy carries the boundary as `readRoots`; every
 * root it names is readable, plus the workspace, plus the platform roots
 * {@link systemReadRoots} fixes. `undefined` keeps the unconfined reads every
 * deployment had before the boundary existed, so a policy that does not name
 * one is unchanged.
 * @param policy - the file-effect policy to derive the read allow-list from.
 * @returns the canonical readable roots, or `undefined` when reads are unconfined.
 */
export function readRootsFor(policy: SandboxExecutionPolicy): string[] | undefined {
  if (policy.readRoots === undefined) return undefined
  return [...new Set([policy.workspaceRoot, ...policy.readRoots, ...systemReadRoots()].map(canonicalPath))]
}
