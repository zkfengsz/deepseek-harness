# Agent Note: WorkBro brand plugin fills the sidebar and hero brand slots

Status: implemented

English | [中文](2026-09-11-workbro-brand-plugin.zh.md)

## Problem

The generic sidebar and hero brand slots fall back to the DeepSeek fish mark and the built-in harness name. WorkBro needs its own mark and name on those surfaces without shipping the official DeepSeek brand.

## Decision

Add a client-only package `@deepseek-ai/dsh-client-ui-brand-workbro` that registers one rounded "W" monogram into `sidebar.brand.mark` and `conversation.hero.brand.mark`, and the WorkBro name into `sidebar.brand.name` (locale-owned `brand.name`). The mark is one component shared by both slots, because a second near-identical one trips the repository's cross-file clone gate. The node half is an inert `apply`; the package registers no tools, prompts, or events.

## Alternatives considered

**Replace the official brand package in place.** Editing `client-ui-brand-official` would change the shipped DeepSeek identity for every deployment instead of adding one that a profile opts into, and the brand slots are single-registration: the second registrant would conflict with the first.

**Ship authored logo artwork.** The portal only needs a legible mark that is not the vendor's; a styled glyph carries no binary asset, no asset pipeline, and no license question.

## Consequences

Both brand slots read a single registered mark and name, so a profile that mounts this plugin shows WorkBro throughout and one that does not keeps the shipped brand. The mark is a styled glyph rather than logo artwork, and it replaces the animated fallback with a static one.
