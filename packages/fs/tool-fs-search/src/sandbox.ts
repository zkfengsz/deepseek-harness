/**
 * The read-boundary enforcement for the `glob` / `grep` tools. These tools
 * spawn ripgrep directly instead of reading through `ctx.fs`, so the
 * filesystem fence never sees them: their search ROOT is checked here, before
 * anything spawns, against the same allow-list the fence derives
 * (`readRootsFor`) and with the same containment test the filesystem seam
 * exposes (`FileSystem.contains`). A search rooted outside the calling
 * session's data boundary is denied, and an approved one-call read widening
 * lets exactly that call through.
 *
 * The check covers the root, not every path ripgrep descends into: a root
 * inside the boundary whose subtree holds a symlink pointing out is not
 * re-examined per file. The harness's own read tools observe the same tree
 * through `ctx.fs`, which does canonicalize each file it opens.
 *
 * @module @deepseek-ai/dsh-tool-fs-search/sandbox
 */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-fs'
import type { FsTarget } from '@deepseek-ai/dsh-fs'
import { READ_ESCALATION_TARGET, readRootsFor } from '@deepseek-ai/dsh-sandbox'
import type { SandboxPolicyService } from '@deepseek-ai/dsh-sandbox-policy'
import type {} from '@deepseek-ai/dsh-sandbox-policy'
import type { ToolExecution } from '@deepseek-ai/dsh-tools'
import { approveReadWidening, readDenialMarker, readEscalationHint, readEscalationSchemaFields } from '@deepseek-ai/dsh-tool-fs'
import type { EscalationSchemaFields, FsEscalationArgs } from '@deepseek-ai/dsh-tool-fs'
import { SearchError } from './search-core.ts'

/**
 * The search-side read boundary: advertisement gating for the escalation
 * fields, the root check every confined search passes, and the approved
 * one-call widening. A pure product of `ctx` at plugin apply time.
 */
export class SearchSandbox {
  /**
   * The escalation targets the search tools advertise: the read widening while
   * this deployment confines its sessions' reads, empty otherwise (a search
   * that cannot be denied has no widening to offer).
   */
  readonly readEscalationModes: readonly string[]
  /** The deployment's sandbox policy, or undefined when this composition confines nothing. */
  private readonly policy: SandboxPolicyService | undefined

  constructor(private readonly ctx: Context) {
    this.policy = ctx.get('sandboxPolicy')
    this.readEscalationModes = this.policy?.confineReads === true ? [READ_ESCALATION_TARGET] : []
  }

  /**
   * The escalation schema fields a search tool advertises. Call it only while
   * reads are confined (guard on {@link readEscalationModes}).
   * @returns the two escalation parameter specs.
   */
  schemaFields(): EscalationSchemaFields {
    return readEscalationSchemaFields()
  }

  /**
   * Refuse a search rooted outside the calling session's data boundary. An
   * unspecified root defaults to the session workspace, which the allow-list
   * always contains, so the default search stays inside by construction rather
   * than by omission. A deployment that composes no filesystem cannot prove
   * containment for a session whose reads are confined, and therefore fails
   * closed instead of searching the host.
   * @param toolName - `glob` or `grep`, used in the denial text.
   * @param exec - the tool-execution context; supplies the calling session.
   * @param requestedPath - the raw `path` argument, or undefined for the default root.
   */
  async assertRootInsideBoundary(toolName: string, exec: ToolExecution, requestedPath: string | undefined): Promise<void> {
    const policy = this.policy?.resolve({ ...exec.agent ? { session: exec.agent.session } : {} })
    if (policy === undefined) return
    const roots = readRootsFor(policy)
    if (roots === undefined) return
    const fs = this.ctx.get('fs')
    if (fs === undefined) {
      throw new SearchError(
        `${readDenialMarker()}\n${toolName} cannot search: this deployment confines session reads but composes no filesystem service to resolve them against`,
        'SEARCH_DENIED',
      )
    }
    const root = requestedPath ?? policy.workspaceRoot
    const candidate = await fs.resolve(root, { cwd: policy.workspaceRoot })
    for (const allowed of roots) {
      const allowedTarget: FsTarget = await fs.resolve(allowed)
      if (fs.contains(allowedTarget, candidate)) return
    }
    throw new SearchError(`${readDenialMarker()}\n${readEscalationHint()}`, 'SEARCH_DENIED')
  }

  /**
   * Resolve the approved read widening for one search, through the sequence
   * every reading tool shares: argument pairing, then the read precondition,
   * then the human — before anything spawns.
   * @param toolName - the search tool's name, for the approval audit trail.
   * @param args - the call's escalation arguments.
   * @param exec - the tool-execution context (agent, callId, signal).
   * @returns true when this call's search root needs no boundary check.
   */
  widenOnce(toolName: string, args: FsEscalationArgs, exec: ToolExecution): Promise<boolean> {
    return approveReadWidening(this.ctx, this.policy, toolName, args, exec)
  }
}
