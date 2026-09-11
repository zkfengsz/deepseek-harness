# Agent Note: WorkBro home portal — the app grid in the blank-session hero

Status: implemented

English | [中文](2026-09-11-workbro-home-portal.zh.md)

## Problem

The blank-session hero showed a workspace picker and an agent-preset control but no application-style landing. WorkBro wants a portal that lists its applications as launchable cards and opens one on click, without new host services or session events: the harness composes a session from an agent preset, and a workspace is only one input to that.

## Decision

Add a full-width single slot `conversation.hero.apps`, declared by `ui-conversation` and rendered in `ConversationRoot.tsx` between the hero workspace row and the composer. Its owner props are `onOpenApp(app)` and `selectedAppId`, so the portal decides nothing about sessions itself.

A client package `@deepseek-ai/dsh-client-ui-home` fills the slot: `HomePortal` reads the app roster through the app controller's `apps` service, renders one card per app, and calls `onOpenApp`. The owner then stages the app's preset and starts the session the launch lands on — a new session in the app's bound workspace when it has one, otherwise `startSession()` on the current workspace.

## Alternatives considered

**List workspaces rather than apps.** A workspace is a directory the agent may read, not an application; a deployment with two workspaces and four apps could not express the four apps, and the card would have no place to name a preset or an icon.

**Register the portal as its own root surface.** A separate landing outside the conversation would need its own navigation, session-start path, and composer hand-off. Reusing the hero's blank-session position inherits all three and keeps the portal where a launch already belongs.

## Consequences

An app is now a durable registration with a name, an optional preset, and an optional bound workspace, so launching one is a composition choice rather than a file dialog. The portal owns no session logic and shows no launch progress of its own; a refused preset surfaces through the preset surface's own banner. Card chrome uses the theme's half-pixel hairline, which the styling gate requires. A `workbro.app.yml` manifest for icon and description overrides is deferred; the registry's own fields carry both today.
