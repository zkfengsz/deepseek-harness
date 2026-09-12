/**
 * The sandbox-escalation API shared by the `write` and `edit` tools and the
 * READ tools (`read`, `read_image`): the per-call policy resolution, the
 * advertised escalation fields, the one-call read widening, and the
 * denial-marker mapping — all delegating the vocabulary and the fail-closed
 * approval sequence to `@deepseek-ai/dsh-sandbox` (the same pieces
 * `@deepseek-ai/dsh-tool-bash` uses), so bash and fs escalate identically.
 * Built ONCE per plugin from `ctx.fs.sandboxMode` (the capability fact — is a
 * confining backend mounted?) and from `ctx.sandboxPolicy.confineReads` (the
 * deployment fact — do this deployment's session reads stop at a data
 * boundary?), and shared by every tool that escalates.
 *
 * @module @deepseek-ai/dsh-tool-fs/sandbox
 */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-agent'
import type { ToolExecution } from '@deepseek-ai/dsh-tools'
import type { SandboxExecutionPolicy, SandboxMode } from '@deepseek-ai/dsh-sandbox'
import {
  ESCALATION_TARGETS,
  READ_ESCALATION_TARGET,
  approveEscalation,
  escalationHintMarker,
  readRootsFor,
  sandboxDenialMarker,
  validateEscalationArgs,
} from '@deepseek-ai/dsh-sandbox'
import type { SandboxPolicyService } from '@deepseek-ai/dsh-sandbox-policy'
import { FsError } from '@deepseek-ai/dsh-fs'

/** The two escalation arguments a tool may carry (advertised only where escalation exists). */
export interface FsEscalationArgs {
  sandbox_permissions?: string
  justification?: string
}

/** The schema fields for the escalation arguments, spread into a tool's `parameters` when a confining backend is mounted. */
export interface EscalationSchemaFields {
  sandbox_permissions: { type: 'string'; enum: string[]; description: string }
  justification: { type: 'string'; description: string }
}

/**
 * The model-facing marker for a read the data boundary refused. It names the
 * BOUNDARY rather than a write mode: no write mode opens reads, and a message
 * about `workspace-write` would send the model after a lever that cannot help.
 * @returns the marker line, exactly as the model sees it.
 */
export function readDenialMarker(): string {
  return '[sandbox: file read denied outside this session\'s data boundary]'
}

/**
 * The same-turn retry hint that rides a denied read — {@link READ_ESCALATION_TARGET}
 * named verbatim, because the write ladder's "narrowest wider mode" wording has
 * no answer for reads: the one value that widens them is not a mode.
 * @returns the hint line, exactly as the model sees it.
 */
export function readEscalationHint(): string {
  return `[sandbox: escalation available — retry this exact read once with sandbox_permissions: "${READ_ESCALATION_TARGET}" + justification, which lifts the boundary for that ONE call and never widens writes; the approval prompt asks the user]`
}

/**
 * The escalation fields a READ tool advertises while a deployment confines its
 * sessions' reads — one home for the wording every reading tool (`read`,
 * `read_image`, and the search tools in `@deepseek-ai/dsh-tool-fs-search`)
 * teaches the model.
 * @returns the two escalation parameter specs, whose enum holds the read widening.
 */
export function readEscalationSchemaFields(): EscalationSchemaFields {
  return {
    sandbox_permissions: {
      type: 'string',
      enum: [READ_ESCALATION_TARGET],
      description: `The read widening this file read needs: "${READ_ESCALATION_TARGET}" lifts this session's data boundary for this ONE call `
        + 'and changes nothing about writes. Only valid as a one-shot retry of a read the boundary just denied; requires justification and user approval.',
    },
    justification: {
      type: 'string',
      description: 'Required with sandbox_permissions: one sentence for the user explaining '
        + "why this exact file read needs to leave the session's data boundary.",
    },
  }
}

/**
 * Resolve one approved READ widening through the calling session's policy — the
 * ordered fail-closed sequence shared by every reading tool: argument pairing,
 * then the read precondition (a wider WRITE mode cannot lift a read boundary,
 * so it is refused before a human is asked), then the approval channel, then
 * the grant. Nothing is read before an approval lands.
 * @param ctx - the plugin context; the approval channel is read from it.
 * @param policy - the deployment's sandbox policy service, or undefined when
 *   this composition has none (then no read boundary exists to widen).
 * @param toolName - the reading tool's name, for the approval audit trail.
 * @param args - the call's escalation arguments.
 * @param exec - the tool-execution context (agent, callId, signal).
 * @returns true when this call's reads run unconfined because it was approved.
 */
export async function approveReadWidening(
  ctx: Context,
  policy: SandboxPolicyService | undefined,
  toolName: string,
  args: FsEscalationArgs,
  exec: ToolExecution,
): Promise<boolean> {
  validateEscalationArgs(args.sandbox_permissions, args.justification)
  if (args.sandbox_permissions === undefined || args.justification === undefined) return false
  if (policy === undefined) {
    throw new Error('sandbox_permissions is not available in this composition (no sandboxing filesystem to escalate)')
  }
  if (args.sandbox_permissions !== READ_ESCALATION_TARGET) {
    throw new Error(`a read is widened only by sandbox_permissions "${READ_ESCALATION_TARGET}"; "${args.sandbox_permissions}" is a write mode and does not lift this session's read boundary`)
  }
  const standing = policy.resolve({ ...exec.agent ? { session: exec.agent.session } : {} })
  const granted = await approveEscalation(
    {
      requestedMode: args.sandbox_permissions,
      justification: args.justification,
      effectiveMode: standing.mode,
      subject: 'read',
      readsConfined: readRootsFor(standing) !== undefined,
    },
    {
      approver: ctx.get('approval'),
      agent: exec.agent,
      callId: exec.callId,
      toolName,
      signal: exec.signal,
    },
  )
  /* v8 ignore next -- the precondition above admits only the read target, and that target grants the read. */
  if (granted.kind !== 'read') throw new Error(`sandbox escalation to "${READ_ESCALATION_TARGET}" returned a ${granted.kind} grant`)
  return true
}

/**
 * The filesystem escalation API: advertisement gating, per-call policy
 * resolution, the one-approved wider retry, and denial-marker mapping. A pure
 * product of `ctx` at plugin apply time.
 */
export class FsSandboxController {
  /** The escalation targets the MUTATING tools advertise (`[]` when no confining backend is mounted). */
  readonly escalationModes: readonly SandboxMode[]
  /**
   * The escalation targets the READ tools advertise: the read widening while
   * this deployment confines its sessions' reads, empty otherwise. A deployment
   * that names no boundary has no denied read to retry, so advertising the
   * value there would promise a lever the composition cannot pull.
   */
  readonly readEscalationModes: readonly string[]
  /** Shared per-session policy resolver, required by a confining backend. */
  private readonly policy: SandboxPolicyService | undefined

  constructor(private readonly ctx: Context) {
    const defaultMode = ctx.fs.sandboxMode
    this.escalationModes = defaultMode === undefined ? [] : ESCALATION_TARGETS
    this.policy = defaultMode === undefined ? undefined : ctx.get('sandboxPolicy')
    if (defaultMode !== undefined && this.policy === undefined) {
      throw new Error('tool-fs: the mounted filesystem confines but ctx.sandboxPolicy is missing')
    }
    this.readEscalationModes = defaultMode !== undefined && this.policy?.confineReads === true ? [READ_ESCALATION_TARGET] : []
  }

  /**
   * The escalation schema fields for a mutating tool's `parameters`. Call it
   * only under a confining backend (guard on {@link escalationModes}); the
   * enum pins the closed target vocabulary, the strict-wider check happens per
   * call at execution.
   * @returns the two escalation parameter specs.
   */
  schemaFields(): EscalationSchemaFields {
    return {
      sandbox_permissions: {
        type: 'string',
        enum: [...this.escalationModes],
        description: 'The wider sandbox mode this file operation needs. Only valid as a one-shot retry '
          + 'of an operation the sandbox just denied; requires justification and user approval.',
      },
      justification: {
        type: 'string',
        description: 'Required with sandbox_permissions: one sentence for the user explaining '
          + 'why this exact file operation needs the wider access.',
      },
    }
  }

  /**
   * The escalation schema fields for a READ tool's `parameters`. Call it only
   * when reads are confined (guard on {@link readEscalationModes}).
   * @returns the two escalation parameter specs, whose enum holds the read widening.
   */
  readSchemaFields(): EscalationSchemaFields {
    return readEscalationSchemaFields()
  }

  /**
   * The policy to stamp onto this mutation: an approved escalation grant (a
   * strictly wider retry resolved through `ctx.approval` before anything
   * executes), else the session's standing mode. The calling session's cwd is
   * always carried as the workspace root. Validates the escalation argument
   * pairing first.
   * @param toolName - the mutating tool's name, for the approval audit trail.
   * @param args - the call's escalation arguments.
   * @param exec - the tool-execution context (agent, callId, signal).
   * @returns the policy to pass to the mutation, or undefined for an
   *   unsandboxed backend.
   */
  async resolvePolicy(toolName: string, args: FsEscalationArgs, exec: ToolExecution): Promise<SandboxExecutionPolicy | undefined> {
    validateEscalationArgs(args.sandbox_permissions, args.justification)
    const standingPolicy = this.policy?.resolve({ ...exec.agent ? { session: exec.agent.session } : {} })
    if (args.sandbox_permissions === undefined || args.justification === undefined) {
      return standingPolicy
    }
    if (this.escalationModes.length === 0) {
      throw new Error('sandbox_permissions is not available in this composition (no sandboxing filesystem to escalate)')
    }
    const policy = standingPolicy as SandboxExecutionPolicy
    const granted = await approveEscalation(
      { requestedMode: args.sandbox_permissions, justification: args.justification, effectiveMode: policy.mode, subject: 'operation' },
      {
        approver: this.ctx.get('approval'),
        agent: exec.agent,
        callId: exec.callId,
        toolName,
        signal: exec.signal,
      },
    )
    /* v8 ignore next -- the mutating enum is ESCALATION_TARGETS, so the read target cannot be requested here. */
    if (granted.kind !== 'mode') throw new Error(`sandbox escalation to "${READ_ESCALATION_TARGET}" is not a mutation widening`)
    return { ...policy, mode: granted.mode }
  }

  /**
   * Resolve the READ widening for one call: whether an approved
   * `sandbox_permissions: "read-anywhere"` retry lifts the calling session's
   * data boundary for exactly this read, with the write mode untouched. The
   * ordered fail-closed sequence is the shared one — argument pairing, then the
   * read precondition, then the human, then execution — so nothing is read
   * before an approval lands. A wider WRITE mode is refused here rather than
   * approved: it cannot lift a read boundary, so prompting a human for it would
   * ask for something that does not help.
   * @param toolName - the reading tool's name, for the approval audit trail.
   * @param args - the call's escalation arguments.
   * @param exec - the tool-execution context (agent, callId, signal).
   * @returns true when this call's reads run unconfined because it was approved.
   */
  async widenReadsOnce(toolName: string, args: FsEscalationArgs, exec: ToolExecution): Promise<boolean> {
    validateEscalationArgs(args.sandbox_permissions, args.justification)
    if (this.policy === undefined && args.sandbox_permissions === undefined) return false
    return approveReadWidening(this.ctx, this.policy, toolName, args, exec)
  }

  /**
   * Run one read, hiding the calling session for the duration when this call
   * holds an approved read widening. The filesystem fence resolves the boundary
   * from the initiating agent, and an agent-less call is the unconfined path by
   * contract, so hiding the initiator is exactly "this one call reads without
   * the boundary" — and it is scoped to this call, restoring the session for
   * everything after it.
   * @param widened - whether {@link widenReadsOnce} approved this call.
   * @param operation - the read to run.
   * @returns the read's own result.
   */
  async asApprovedRead<T>(widened: boolean, operation: () => Promise<T>): Promise<T> {
    if (!widened) return operation()
    const agents = this.ctx.get('agents')
    if (agents === undefined) {
      throw new Error('the approved read widening cannot be applied: this composition has no ctx.agents to lift the boundary for one call')
    }
    return agents.withoutInitiator(operation)
  }

  /**
   * Map a thrown provider error for the model: a `FS_SANDBOX_DENIED` becomes a
   * `FsError` whose text is the shared `[sandbox: …]` denial marker plus the
   * same-turn escalation hint, so a policy denial reads identically to bash's
   * WHILE keeping the structured `FS_SANDBOX_DENIED` code — `ToolRuntime`
   * populates `result.error` only for `HarnessError` instances, so a plain
   * `Error` would strip the code retry/observers key off. Any other error
   * passes through unchanged. A `FS_SANDBOX_DENIED` only arises under a
   * confining backend, which always advertises the escalation fields, so the
   * hint always applies here.
   * @param error - the error thrown by the mutation.
   * @param policy - the policy stamped onto the call (names the mode in the marker).
   * @returns the error to throw — the marker `FsError` for a sandbox denial, else the original.
   */
  mapError(error: unknown, policy: SandboxExecutionPolicy | undefined): unknown {
    if (!(error instanceof FsError) || error.code !== 'FS_SANDBOX_DENIED') return error
    // A FS_SANDBOX_DENIED only arises under a confining backend, whose tool
    // path always resolves a policy before mutation.
    const mode = (policy as SandboxExecutionPolicy).mode
    return new FsError(`${sandboxDenialMarker(mode)}\n${escalationHintMarker('operation')}`, 'FS_SANDBOX_DENIED', { cause: error })
  }

  /**
   * Map a thrown provider error from a READ for the model. A read denial names
   * the boundary and carries the read-specific retry hint; everything else
   * passes through unchanged, exactly as {@link mapError} treats a mutation.
   * @param error - the error thrown by the read.
   * @returns the error to throw — the read-marker `FsError` for a boundary denial, else the original.
   */
  mapReadError(error: unknown): unknown {
    if (!(error instanceof FsError) || error.code !== 'FS_SANDBOX_DENIED') return error
    return new FsError(`${readDenialMarker()}\n${readEscalationHint()}`, 'FS_SANDBOX_DENIED', { cause: error })
  }
}
