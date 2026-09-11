/**
 * WorkBro home portal plugin, browser half. Registers the application card
 * grid into the conversation hero's apps hole (`conversation.hero.apps`).
 */
import type { Context } from '@deepseek-ai/cordis'
// Type-only: pull the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pull the SlotRegistry service merge (ctx.slots).
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
// Type-only: pull the Client apps service merge (ctx.apps).
import type {} from '@deepseek-ai/dsh-api-app-controller/client'
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
export const inject = ['slots', 'locale', 'apps']

/**
 * Register the portal once the conversation hero apps slot is declared. The
 * inject factory exposes the app snapshot as a registrant-private useApps
 * hook; launching goes through the owner's onOpenApp callback.
 * @param ctx - client root context.
 */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-home: dictionaries')
  ctx.slots.inject('conversation.hero.apps', () => ctx.slots.register(
    {
      name: 'conversation.hero.apps',
      locale: NS,
      inject: () => ({
        hooks: { apps: ctx.apps.list },
        createApp: (input: { name: string; preset?: string }) => ctx.apps.create(input),
      }),
    },
    HomePortal,
  ))
}
