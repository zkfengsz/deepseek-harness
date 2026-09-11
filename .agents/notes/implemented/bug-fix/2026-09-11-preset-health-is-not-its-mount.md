# Agent Note: a shipped preset's health is not its mount

Status: implemented

English | [中文](2026-09-11-preset-health-is-not-its-mount.zh.md)

## Problem

All four WorkBro starter presets (`compliance`, `credit`, `kyb`, `growth`) shipped with a `tool-todo` row that omitted `allowParallelInProgress`, which `@deepseek-ai/dsh-tool-todo` requires. The presets were therefore undiscoverable-but-listed: `agentPresets/list` reported every one of them healthy and the roster rendered their cards, while any attempt to compose a session from one failed with `agent-preset/invalid` and a config error naming the row.

The failure was invisible on both sides of the wire. `list()` asks only whether each row's package resolves — the shipped presets' own suite says so, and deliberately tolerates unresolved rows because its fixture base is not the deployment's install. Composing is what applies each row's `Config`. And the refusal leaves no session event, because the Host appends `agent-preset/selected` only after a successful mount, so a refused switch and a switch never attempted leave identical session logs.

## Decision

Every shipped preset carries the configuration its rows require; `tool-todo` gets `allowParallelInProgress: true`, matching the `standard` preset.

The four presets are otherwise unchanged: their rows are a subset of `standard`'s model-facing tools plus their own persona, so they need no realm and provide no service.

## Alternatives considered

**Make `agentPresets/list` mount each preset to report health.** That would have caught this at the roster read, and the browser would have shown a broken badge instead of a card. It also mounts every preset on every list read, on a path the settings surface and the hero chip both hit; the roster already defers mounts to the first agent that needs one. Rejected as a cost this fact does not justify.

**Give the presets their own mount test in this package's suite.** The suite's harness composes a fixture base, which is exactly what cannot resolve these rows; the deployment resolves them through the profile's healed module fallback, reachable only by booting a real profile.

**Validate each row's `config` statically against its plugin's schema.** A generic check needs one dialect per plugin, and the schemas plugins export are not uniform.

## Consequences

The four presets compose. The gap remains that nothing in this repository boots a real profile and mounts every shipped preset, so a row whose `Config` is rejected is still caught only by a deployment — the check that found this one booted the `web` profile and called `standingKeyFor` per preset. `list()`'s resolution-only health is unchanged, and its suite's comment records why.
