/** Apply wiring for the WorkBro brand browser plugin. */
import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { WorkBroMark, WorkBroName } from '../src/client/Brand.tsx'
import { apply, inject } from '../src/client/index.ts'
import { apply as hostApply } from '../src/index.ts'

async function bench() {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  const locale = new LocaleRuntime(ctx)
  locale.setLocale('zh')
  ctx.provide('locale', locale)
  return { ctx, slots: ctx.get('slots') as SlotRegistry, locale }
}

function declare(slots: SlotRegistry): () => void {
  return slots.register({ name: 'root', children: {
    'sidebar.brand.mark': { kind: 'single', scope: 'root' },
    'sidebar.brand.name': { kind: 'single', scope: 'root' },
    'conversation.hero.brand.mark': { kind: 'single', scope: 'root' },
  } } as never, () => null)
}

describe('ui-brand-workbro apply', () => {
  it('keeps the host Loader entry inert', () => {
    expect(hostApply).not.toThrow()
  })

  it('declares the services it drives', () => {
    expect(inject).toEqual(['slots', 'locale'])
  })

  it('registers the brand occupants', async () => {
    const b = await bench()
    declare(b.slots)
    await b.ctx.plugin({ inject: [...inject], apply }).await()
    expect(b.slots.entries('sidebar.brand.mark')[0]!.component).toBe(WorkBroMark)
    expect(b.slots.entries('sidebar.brand.name')[0]!.component).toBe(WorkBroName)
    expect(b.slots.entries('conversation.hero.brand.mark')[0]!.component).toBe(WorkBroMark)
    expect(b.locale.bind('workbroBrand')('brand.name')).toBe('WorkBro')
  })

  it('unregisters every occupant on teardown', async () => {
    const b = await bench()
    declare(b.slots)
    const fiber = b.ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    await fiber.dispose()
    expect(b.slots.entries('sidebar.brand.mark')).toHaveLength(0)
    expect(b.slots.entries('sidebar.brand.name')).toHaveLength(0)
    expect(b.slots.entries('conversation.hero.brand.mark')).toHaveLength(0)
  })
})
