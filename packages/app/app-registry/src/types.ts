/** Public type vocabulary of the WorkBro application entity. Types only. */
import type { Branded } from '@deepseek-ai/dsh-brand'
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace/types'

/** Identifies one WorkBro application record. A generated uuid, never a name. */
export type AppId = Branded<'AppId'>

/**
 * One WorkBro application: a first-class launchable workbench. Its preset
 * names the agent composition to stage; an optional workspace binding makes a
 * directory its data context. Consumers see this interface only.
 */
export interface App {
  /** Stable record id (generated uuid). */
  readonly id: AppId

  /** Display name. */
  readonly name: string

  /** Single emoji or short glyph shown on the portal card. */
  readonly icon?: string | undefined

  /** One-line description. */
  readonly description?: string | undefined

  /** Agent preset to stage when opening the app. */
  readonly preset?: string | undefined

  /** Bound workspace directory context, when this app is directory-backed. */
  readonly workspaceId?: WorkspaceId | undefined
}
