/** Apply wiring for the WorkBro home portal browser plugin. */
import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { HomePortal } from '../src/client/HomePortal.tsx'
import { apply, inject } from '../src/client/index.ts'
import { apply as hostApply } from '../src/index.ts'

/** Boot the two services the plugin drives and return the live slots/locale. */
async function bench() {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  const locale = new LocaleRuntime(ctx)
  locale.setLocale('zh')
  ctx.provide('locale', locale)
  return { ctx, slots: ctx.get('slots') as SlotRegistry, locale }
}

/** Declare the target hole as a child of the built-in root slot. */
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
    expect(inject).toEqual(['slots', 'locale'])
  })

  it('registers the portal for declarations before or after apply', async () => {
    const before = await bench()
    declare(before.slots)
    await before.ctx.plugin({ inject: [...inject], apply }).await()
    expect(before.slots.entries('conversation.hero.apps')[0]!.component).toBe(HomePortal)
    expect(before.slots.entries('conversation.hero.apps')[0]!.locale).toBe('home')
    expect(before.locale.bind('home')('portal.title')).toBe('应用')

    const after = await bench()
    await after.ctx.plugin({ inject: [...inject], apply }).await()
    declare(after.slots)
    await Promise.resolve()
    expect(after.slots.entries('conversation.hero.apps')[0]!.component).toBe(HomePortal)
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
