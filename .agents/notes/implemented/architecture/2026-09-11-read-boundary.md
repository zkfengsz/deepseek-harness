# Agent Note: the read boundary — confining what a session may see

Status: implemented

English | [中文](2026-09-11-read-boundary.zh.md)

## Problem

The sandbox only ever governed writes. `SandboxMode` is documented as file effects, and in practice `read-only` names a rule about modification, not about reading: macOS ran `(allow default)` with `(deny file-write*)`, bwrap mounted the whole filesystem read-only, Landlock granted `readOnly: ['/']`. Measured on the WorkBro deployment, an agent could read `/etc/hosts`, list the operator's home directory, and read any credential file on the machine, while its writes stopped at the session workspace and the temp areas.

For a compliance, KYB, or credit workbench that asymmetry is backwards. The harm is not a modified file; it is an operator's other project, another application's records, or a `.env` reaching a model request. A deployment could already narrow writes, and could not narrow reads at all.

## Decision

**A read boundary is its own axis, not a wider mode.** `SandboxExecutionPolicy` gained `readRoots?: readonly string[]`. Absent means reads stay unconfined — the behaviour every deployment had before the field existed — and present means reads stop at the workspace plus those roots plus the platform roots a process needs to run. `readRootsFor(policy)` derives the canonical allow-list and `systemReadRoots()` fixes the platform half, in the same module as `writableRoots`, so the in-process fence and each kernel dialect cannot drift.

**Confinement is a flag, not an empty list.** `SandboxPolicyService` config carries `confineReads?: boolean` beside `readRoots?: string[]`. A schema cannot tell an absent array from an empty one — `z.array()` fills `[]` — and the two ends of this field mean opposite things, so the decision rides a boolean whose absent value is a real `undefined`.

**The boundary is per session; agentless calls stay unconfined.** `resolve()` attaches `readRoots` only when it has a session. The boundary answers what one session may see, and the harness reading its own machinery — skill discovery, preset files, session logs — is not a session.

**Approving an out-of-boundary read must not widen writes.** The escalation vocabulary gained `READ_ESCALATION_TARGET` (`'read-anywhere'`), deliberately outside the mode ladder, and `approveEscalation` now returns a `SandboxEscalationGrant` union: `{ kind: 'mode' }` for the existing write ladder, `{ kind: 'read' }` for a boundary lifted on one call. A write mode cannot express the read widening, because widening to `danger-full-access` would hand the same call an unfenced write.

**Tool schemas advertise the read target from a deployment fact.** A schema is composed at `apply()`, where no session exists, so the enum cannot be gated per call. `SandboxPolicyService.confineReads` is public for exactly that read; the per-call `readsConfined` precondition stays the authoritative check at execution, which is what refuses a stale schema.

**A deployment turns it on; the shared bundle does not.** The WorkBro deployment patches its own profile's `sandbox-policy` row with `confineReads: true` and its data roots — the two home-directory skill roots and the Node installation running the host — so each session's boundary is its own workspace, which is what "an application may read its own data context" means operationally. Which deployments confine reads is a deployment choice, and DSH already states where such a choice lives: a validated `Config` field changeable from `cordis.yml`, not a value baked into a shared composition. Enabling it in `packages/bundle/web-app` would also change model-visible output — four read-tool schemas and one prompt-context sentence — which the repository requires be paired with a refreshed recorded-session corpus, and that refresh needs a recording key this machine does not have.

## Alternatives considered

**Express the widening as a wider `SandboxMode`.** The ladder is already in the schema and needs no new value, but approving one read would also grant `danger-full-access` writes — the approval prompt would say "read this file" while granting far more. Rejected as a security inversion.

**Make the session workspace the only readable root.** Simplest to state and to test, but skills live in home-directory roots and a shell cannot start its own interpreter without reading the toolchain, so the boundary would break the agent rather than confine it. The platform roots and the deployment's data roots are named instead.

**Turn it on inside the shipped web bundle.** That is where the WorkBro product declares its own defaults, and it would make confinement true of every WorkBro install without a deployment edit. It also changes the schemas of four read tools and adds a sentence to the model's policy context, so the recorded sessions under `snapshots/web` no longer replay; refreshing them requires `DSH_SNAPSHOT=record` and a provider key. The capability ships now and the switch is a deployment edit, which leaves the corpus consistent and the decision where DSH puts deployment-varying policy.

**Enforce reads by making the fs provider refuse every path outside the boundary.** The in-process fence alone is not a boundary: the shell family reaches the filesystem through the kernel, so both the fence and the platform dialects enforce the same derived allow-list.

## Consequences

A confined deployment stops a session from reading outside its data context, and the model is told so in its runtime context rather than discovering it by denial. Verified against the real `web` profile: a session-bearing read inside the boundary succeeds, one outside it fails with `file access denied outside this session's data boundary`, and an agentless read still succeeds. An out-of-boundary read is refused with the boundary named and can be approved once, for that call only, without changing what the call may write.

The boundary is not a container: network egress, process visibility, and the host process outside the sandbox are unchanged, and the Windows ACL backend is out of scope for this change. Agentless calls remain unconfined by design, so a capability that reads on the harness's behalf is not affected — which also means the boundary must not be mistaken for a per-process guarantee.

`list()` and the roster surfaces still report a preset as healthy when its rows resolve but cannot mount; nothing here changes that, and the two gaps were found together: a WorkBro preset that could not compose made a session run the deployment default while the boundary work was in progress.
