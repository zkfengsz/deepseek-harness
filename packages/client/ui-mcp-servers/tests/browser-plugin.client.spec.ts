/** Apply wiring for the MCP servers settings browser plugin. */
import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { resolveSlotLabel } from '@deepseek-ai/dsh-client-ui-slots'
import { McpServersSection } from '../src/client/McpServersSection.tsx'
import { apply, inject } from '../src/client/index.ts'
import { apply as hostApply } from '../src/index.ts'

async function bench() {
  const ctx = new Context()
  await ctx.plugin(SlotRegistry).await()
  const locale = new LocaleRuntime(ctx)
  locale.setLocale('zh')
  ctx.provide('locale', locale)
  const calls: string[] = []
  ctx.provide('mcpServers', {
    list: { getSnapshot: () => ({ servers: [] }), subscribe: () => () => {} },
    create: (input: unknown) => { calls.push(`create:${JSON.stringify(input)}`); return Promise.resolve(undefined) },
    update: (id: unknown) => { calls.push(`update:${String(id)}`); return Promise.resolve(undefined) },
    delete: (id: unknown) => { calls.push(`delete:${String(id)}`); return Promise.resolve() },
  } as never)
  return { ctx, slots: ctx.get('slots') as SlotRegistry, calls }
}

function declare(slots: SlotRegistry): () => void {
  return slots.register(
    { name: 'root', children: { 'settings.section': { kind: 'list', scope: 'root' } } } as never,
    () => null,
  )
}

describe('ui-mcp-servers apply', () => {
  it('keeps the host Loader entry inert', () => {
    expect(hostApply).not.toThrow()
  })

  it('declares the services it drives', () => {
    expect(inject).toEqual(['slots', 'locale', 'mcpServers'])
  })

  it('registers the section into the settings slot', async () => {
    const b = await bench()
    declare(b.slots)
    await b.ctx.plugin({ inject: [...inject], apply }).await()
    const section = b.slots.entries('settings.section')[0]!
    expect(section.component).toBe(McpServersSection)
    expect(section.options).toMatchObject({ id: 'mcp-servers', order: 21 })
    expect(resolveSlotLabel(section.options.label)).toBe('MCP 服务器')
  })

  it('routes the write commands to the shared service', async () => {
    const b = await bench()
    declare(b.slots)
    await b.ctx.plugin({ inject: [...inject], apply }).await()
    const section = b.slots.entries('settings.section')[0]!
    const face = section.inject as unknown as () => {
      hooks: { servers: { getSnapshot(): { servers: unknown[] } } }
      create: (input: unknown) => Promise<unknown>
      update: (id: string, input: unknown) => Promise<unknown>
      delete: (id: string) => Promise<void>
      t: (key: string) => string
    }
    const injected = face()
    expect(injected.hooks.servers.getSnapshot().servers).toEqual([])
    expect(injected.t('nav')).toBe('MCP 服务器')

    await injected.create({ serverName: 'a', transport: 'stdio' })
    await injected.update('s1', { serverName: 'a', transport: 'stdio' })
    await injected.delete('s1')
    expect(b.calls).toEqual([
      'create:{"serverName":"a","transport":"stdio"}',
      'update:s1',
      'delete:s1',
    ])
  })

  it('unregisters the section on teardown', async () => {
    const b = await bench()
    declare(b.slots)
    const fiber = b.ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    await fiber.dispose()
    expect(b.slots.entries('settings.section')).toHaveLength(0)
  })
})
