/**
 * WorkBro brand plugin, browser half. Fills the sidebar brand mark/name and the
 * hero brand mark with the WorkBro mark and name, replacing the shipped
 * DeepSeek fish fallback.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { WorkBroMark, WorkBroName } from './Brand.tsx'
import { en, zh, type WorkBroBrandKey } from './locales.ts'

export type { WorkBroBrandKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The WorkBro brand copy. */
    workbroBrand: WorkBroBrandKey
  }
}

/** Dictionary namespace owned by this plugin. */
const NS = 'workbroBrand'

/** Required services (cordis fiber inject). */
export const inject = ['slots', 'locale']

/**
 * Register the WorkBro brand once each target slot is declared.
 * @param ctx - Client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-brand-workbro: dictionaries')
  ctx.slots.inject('sidebar.brand.mark', () => ctx.slots.register(
    { name: 'sidebar.brand.mark' }, WorkBroMark))
  ctx.slots.inject('sidebar.brand.name', () => ctx.slots.register(
    { name: 'sidebar.brand.name', locale: NS }, WorkBroName))
  ctx.slots.inject('conversation.hero.brand.mark', () => ctx.slots.register(
    { name: 'conversation.hero.brand.mark' }, WorkBroMark))
}
