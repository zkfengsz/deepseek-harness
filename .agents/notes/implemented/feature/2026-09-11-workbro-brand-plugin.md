# Agent Note: WorkBro brand plugin fills the sidebar and hero brand slots

Status: implemented

English | [中文](2026-09-11-workbro-brand-plugin.zh.md)

## Problem

The generic sidebar and hero brand slots fall back to the DeepSeek fish mark and the "DSH Local Build" name in the default build. WorkBro needs its own mark and name on those surfaces without shipping the official DeepSeek brand.

## Decision

Add a client-only package `@deepseek-ai/dsh-client-ui-brand-workbro` that registers a rounded "W" monogram into `sidebar.brand.mark` and `conversation.hero.brand.mark`, and the WorkBro name into `sidebar.brand.name` (locale-owned `brand.name`). The node half is an inert `apply`; the package registers no tools, prompts, or events.

## What was given up

- Text-based mark: the "W" is a styled glyph, not authored logo artwork.
- No hero animation: the static monogram replaces the animated fish fallback.
