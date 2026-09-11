# Agent Note: WorkBro home portal — a Workspace card grid in the blank-session hero

Status: implemented

English | [中文](2026-09-11-workbro-home-portal.zh.md)

## Problem

The blank-session hero shows a workspace picker and an agent-preset control, but no application-style landing. WorkBro wants a portal that lists each Workspace as a launchable "app" card (title, path, session count) and opens its blank session on click, without adding host services or session events.

## Decision

Add a full-width single slot `conversation.hero.apps`, declared by `ui-conversation` in `apply.ts` and rendered in `ConversationRoot.tsx` between the hero workspace row and the composer, with owner props `onOpen(workspaceId)` and `selectedId`. A new client package `@deepseek-ai/dsh-client-ui-home` fills it: `HomePortal` reads the global `useWorkspaces` standard hook and launches through the owner's `onOpen`, which reuses `ui-conversation`'s existing `selectWorkspace` navigation. The node half is an inert `apply`; the package registers no tools, prompts, or events.

## What was given up

- No application metadata yet: a card shows only the Workspace title, path, and session count; a `workbro.app.yml` manifest (icon, description, preset) is deferred.
- No launch feedback: the portal shows no pending or error state of its own and relies entirely on the owner's `onOpen`.
