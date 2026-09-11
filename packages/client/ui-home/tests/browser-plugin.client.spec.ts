/** Apply wiring for the WorkBro home portal browser plugin. */
import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { HomePortal } from '../src/client/HomePortal.tsx'
import { apply, inject } from '../src/client/index.ts'
import { apply as hostApply } from '../src/index.ts'

async function bench() {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  const locale = new LocaleRuntime(ctx)
  locale.setLocale('zh')
  ctx.provide('locale', locale)
  ctx.provide('apps', {
    list: { getSnapshot: () => ({ apps: [] }), subscribe: () => () => {} },
  } as never)
  return { ctx, slots: ctx.get('slots') as SlotRegistry, locale }
}

function declare(slots: SlotRegistry): () => void {
  return slots.register(
    { name: 'root', children: { 'conversation.hero.apps': { kind: 'single', scope: 'root' } } } as never,
    () => null,
  )
}

describe('ui-home apply', () => {
  it('keeps the host Loader entry inert', () => {
    expect(hostApply).not.toThrow()
  })

  it('declares the services it drives', () => {
    expect(inject).toEqual(['slots', 'locale', 'apps'])
  })

  it('registers the portal into the conversation hero apps slot', async () => {
    const b = await bench()
    declare(b.slots)
    await b.ctx.plugin({ inject: [...inject], apply }).await()
    expect(b.slots.entries('conversation.hero.apps')[0]!.component).toBe(HomePortal)
    expect(b.slots.entries('conversation.hero.apps')[0]!.locale).toBe('home')
    expect(b.locale.bind('home')('portal.title')).toBe('应用')
  })

  it('unregisters the portal on teardown', async () => {
    const b = await bench()
    declare(b.slots)
    const fiber = b.ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    await fiber.dispose()
    expect(b.slots.entries('conversation.hero.apps')).toHaveLength(0)
  })
})
