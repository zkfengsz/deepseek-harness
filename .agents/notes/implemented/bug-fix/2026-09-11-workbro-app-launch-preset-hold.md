# Agent Note: an app launch's preset survives the session still current

Status: implemented

English | [中文](2026-09-11-workbro-app-launch-preset-hold.zh.md)

## Problem

Opening an app from the WorkBro portal highlighted its card and started a session, but that session ran the deployment default rather than the app's preset. The session log carried the default in its header and no `agent-preset/selected` event, so the swap never reached the Host.

`AgentPresetSeatController.select()` stages the pick and applies it immediately, and `apply()` spends a stage the moment a non-blank session is current — a started session's composition is fixed and the Host refuses the swap. That rule is right for the hero chip, whose pick can only mean the session on screen. It is wrong for a launch: the session the pick is for does not exist yet, and the running one is merely still current while it is created. `startSession()` makes it worse rather than better, because the new summary is published while the old session is still current, so a plain `stage()` loses the pick to that same list notification.

## Decision

`AgentPresetSeatController.launch(id)` stages a pick that belongs to the session a launching surface is about to produce, and `apply()` holds such a stage while a non-blank session is current instead of spending it. The hold ends at the first session that can take it, on a refusal, and when the roster reports mode selection disabled.

The cross-plugin channel stays a service. `ui-agent-preset` publishes `workbroPresetLaunch.launch`, `ui-conversation` reads it with `ctx.get`, and the portal's `stagePreset` calls it. A Cordis client event cannot carry this: an event only trickles down from its emitting context, so a sibling plugin never sees one.

## Alternatives considered

**Carry `agentPreset` through `session.create`.** `SessionCreateRequest` already accepts it, so a launched session could be born composed with no swap and no race. The client chain from `ISessions.create` through the manager, `connectWorkspace`, and `startSession` would each need the field — a wider change to two core packages for the same outcome.

**Drop the non-blank rule in `apply()`.** Keeping the stage whenever a running session is current would fix the launch, but it would also carry a pick made on the hero into some later session, which the chip's contract rules out.

**Stage without applying, from the portal.** `stage()` alone does not survive the `sessions.create` notification, which lands while the previous session is still current.

## Consequences

A launch's preset reaches the session it starts. `ui-home` gains a whole-client assembly spec that opens two sessions and asserts `agentPresets/select` lands on the launched one; disabling the hold inside that spec reproduces the reported symptom exactly, with the select never called. `app-controller` drops its runtime `AppId` imports, because the brand is a pure cast the wire types already carry; that keeps the registry edge out of `SAFE_HOST_DEPENDENCY_EXPORTS`, which automated changes must not extend.
