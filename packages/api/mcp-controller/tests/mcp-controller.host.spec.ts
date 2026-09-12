/** Host-side MCP controller coverage: commands over the registry + manager, with a stubbed typert. */
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Storage from '@deepseek-ai/dsh-storage'
import { DomainFacility } from '@deepseek-ai/dsh-storage-domain'
import McpRegistry from '@deepseek-ai/dsh-mcp-registry'
import McpManager from '@deepseek-ai/dsh-mcp-manager'
import McpController from '../src/index.ts'
import { MemoryStorageBackend } from '../../../storage/storage-domain/tests/helpers/memory-backend.ts'

const roots: Context[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map(ctx => ctx.fiber.dispose()))
})

async function harness(): Promise<{ controller: McpController }> {
  const ctx = new Context()
  roots.push(ctx)
  await ctx.plugin(Storage)
  ctx.storage.backend.register('memory', new MemoryStorageBackend())
  const storageDomain = new DomainFacility(ctx, { backend: 'memory', routes: {} })
  ctx.storage.mount('domain', storageDomain)
  ctx.provide('storageDomain', storageDomain)
  ctx.provide('tools', { register: () => () => undefined })
  await ctx.plugin(McpRegistry)
  await ctx.plugin(McpManager)
  const dispose = (): void => {}
  ctx.provide('typert', {
    lookups: { configure: () => dispose },
    contexts: { configureHost: () => dispose },
  } as never)
  return { controller: new McpController(ctx) }
}

describe('McpController', () => {
  it('lists empty and projects a created stdio server with a live status', async () => {
    const { controller } = await harness()
    expect((await controller.list()).servers).toEqual([])

    const created = await controller.create({ transport: 'stdio', serverName: 'files', command: 'definitely-not-real' })
    expect(created.server).toMatchObject({ serverName: 'files', transport: 'stdio', enabled: true })

    const listed = (await controller.list()).servers
    expect(listed).toHaveLength(1)
    expect(listed[0].id).toBe(created.server.id)
    expect(['starting', 'connected', 'failed', 'disabled']).toContain(listed[0].status)
  })

  it('refuses a stdio request without a command and an http request without a url', async () => {
    const { controller } = await harness()
    await expect(controller.create({ transport: 'stdio', serverName: 'x' }))
      .rejects.toThrow(/require a command/)
    await expect(controller.create({ transport: 'streamable-http', serverName: 'x' }))
      .rejects.toThrow(/require a url/)
  })

  it('updates and deletes a server, failing on an unknown id', async () => {
    const { controller } = await harness()
    const created = await controller.create({ transport: 'stdio', serverName: 'a', command: 'x' })
    const updated = await controller.update({
      id: created.server.id, transport: 'streamable-http', serverName: 'a', url: 'https://mcp.example',
    })
    expect(updated.server.transport).toBe('streamable-http')

    expect((await controller.delete({ id: created.server.id })).deleted).toBe(true)
    await expect(controller.delete({ id: created.server.id })).rejects.toThrow(/not found/)
  })
})
