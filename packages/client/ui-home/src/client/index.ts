/**
 * WorkBro home portal plugin, browser half. Registers the Workspace card grid
 * into the conversation hero's full-width apps hole (`conversation.hero.apps`).
 */
import type { Context } from '@deepseek-ai/cordis'
// Type-only: pull the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pull the SlotRegistry service merge (ctx.slots).
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import { HomePortal } from './HomePortal.tsx'
import { en, zh, type HomeKey } from './locales.ts'

export type { HomePortalProps } from './HomePortal.tsx'
export type { HomeKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The application portal copy. */
    home: HomeKey
  }
}

/** Dictionary namespace owned by this plugin. */
const NS = 'home'

/** Required services (cordis fiber inject). */
export const inject = ['slots', 'locale']

/**
 * Register the portal once the conversation hero apps slot is declared. The
 * inject factory returns no private data; reads use the global useWorkspaces
 * hook and the owner's onOpen callback.
 * @param ctx - client root context.
 */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-home: dictionaries')
  ctx.slots.inject('conversation.hero.apps', () => ctx.slots.register(
    { name: 'conversation.hero.apps', locale: NS },
    HomePortal,
  ))
}
