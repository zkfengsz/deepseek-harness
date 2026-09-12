/**
 * Internal platform-profile builders for the local sandbox provider.
 *
 * @module @deepseek-ai/dsh-sandbox-local/profiles
 */

import { grantArgs as landlockGrantArgs } from '@deepseek-ai/node-addon-system/landlock-run'
import { readRootsFor, writableRoots } from '@deepseek-ai/dsh-sandbox'
import type { SandboxPolicy } from '@deepseek-ai/dsh-sandbox'

/**
 * The roots the bwrap profile mounts itself rather than read-only-binding from
 * the host: `--dev` installs a fresh devtmpfs and `--proc` a fresh procfs, so a
 * read bind at either destination would only be shadowed.
 */
const BWRAP_PROVIDED_ROOTS: ReadonlySet<string> = new Set(['/dev', '/proc'])

/**
 * Build the bwrap profile arguments for one file-effect policy.
 *
 * With reads unconfined the whole tree is bound read-only. With reads confined
 * the profile binds each allow-listed root instead — a mount the profile leaves
 * out does not exist for the wrapped process at all, which is a stronger denial
 * than a permission bit.
 * @param policy - file-effect policy to express as bwrap mounts.
 * @returns profile arguments before the trailing separator and command argv.
 */
export function bwrapProfileArgs(policy: SandboxPolicy): string[] {
  const readRoots = readRootsFor(policy)
  const args = readRoots === undefined
    ? ['--ro-bind', '/', '/']
    : readRoots
      .filter(root => !BWRAP_PROVIDED_ROOTS.has(root))
      .flatMap(root => ['--ro-bind', root, root])
  args.push('--dev', '/dev', '--unshare-pid', '--proc', '/proc', '--die-with-parent')
  if (policy.mode === 'workspace-write') {
    args.push('--tmpfs', '/tmp')
    args.push('--bind', policy.workspaceRoot, policy.workspaceRoot)
  }
  return args
}

/**
 * Build the Landlock launcher grants for one file-effect policy. With reads
 * confined, `readOnly` is the policy's read allow-list rather than the whole
 * tree; the read-write grants are unchanged, so the workspace the mode makes
 * writable stays readable.
 * @param policy - file-effect policy to express as Landlock allow-list grants.
 * @returns launcher grant arguments before the trailing separator and command argv.
 */
export function landlockProfileArgs(policy: SandboxPolicy): string[] {
  const readOnly = readRootsFor(policy)
  const readWrite = ['/dev/null']
  if (policy.mode === 'workspace-write') {
    readWrite.push('/tmp', policy.workspaceRoot)
  }
  return landlockGrantArgs({ readOnly: readOnly ?? ['/'], readWrite })
}

/** Quote one path as an SBPL string literal. */
function sbplString(path: string): string {
  return `"${path.replaceAll('\\', String.raw`\\`).replaceAll('"', String.raw`\"`)}"`
}

/** Render one `(allow <operation> (subpath …) …)` form for an allow-list of roots. */
function sbplAllow(operation: string, roots: readonly string[]): string {
  return `(allow ${operation} ${roots.map(root => `(subpath ${sbplString(root)})`).join(' ')})`
}

/**
 * Build the sandbox-exec arguments and SBPL profile for one policy. The
 * writable roots come from the shared {@link writableRoots} helper (canonical,
 * deduplicated) so the Seatbelt grant and the in-process fs fence
 * (`@deepseek-ai/dsh-fs-sandbox`) can never drift apart.
 *
 * SBPL evaluates a profile top to bottom and the LAST matching rule decides, so
 * a deny is followed by the allow-list that reopens exactly the granted roots.
 * `(allow default)` is retained: it keeps every non-file operation (process
 * execution, IPC, sysctl) working, and the file rules below it are what confine
 * the file effects.
 * @param policy - file-effect policy to express as an SBPL profile.
 * @returns sandbox-exec arguments before the trailing separator and command argv.
 */
export function seatbeltProfileArgs(policy: SandboxPolicy): string[] {
  const forms = ['(version 1)', '(allow default)', '(deny file-write*)', `(allow file-write* (literal ${sbplString('/dev/null')}))`]
  const roots = writableRoots(policy)
  if (roots.length > 0) {
    forms.push(sbplAllow('file-write*', roots))
  }
  const readRoots = readRootsFor(policy)
  if (readRoots !== undefined) {
    // SBPL's `file-write*` does not imply `file-read*`, so the writable roots
    // are read-granted too: a path this call may write but cannot read back is
    // not a boundary the mode promises. `/dev/null` is covered by `systemReadRoots`' `/dev`.
    const readable = [...new Set([...readRoots, ...roots])]
    forms.push('(deny file-read*)')
    forms.push(sbplAllow('file-read*', readable))
  }
  return ['-p', forms.join(' ')]
}
