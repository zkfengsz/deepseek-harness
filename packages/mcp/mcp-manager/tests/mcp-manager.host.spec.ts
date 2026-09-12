/** Host-side MCP manager coverage: start, status, and disposal of supervised connections. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Storage from '@deepseek-ai/dsh-storage'
import { DomainFacility } from '@deepseek-ai/dsh-storage-domain'
import McpRegistry from '@deepseek-ai/dsh-mcp-registry'
import McpManager from '../src/index.ts'
import { MemoryStorageBackend } from '../../../storage/storage-domain/tests/helpers/memory-backend.ts'

const roots: Context[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map(ctx => ctx.fiber.dispose()))
})

async function harness() {
  const ctx = new Context()
  roots.push(ctx)
  await ctx.plugin(Storage)
  ctx.storage.backend.register('memory', new MemoryStorageBackend())
  const storageDomain = new DomainFacility(ctx, { backend: 'memory', routes: {} })
  ctx.storage.mount('domain', storageDomain)
  ctx.provide('storageDomain', storageDomain)
  // A failing stdio server never discovers tools, so the connection only needs
  // a `register` surface; a real ToolRuntime is not required for these cases.
  ctx.provide('tools', { register: () => () => undefined })
  await ctx.plugin(McpRegistry)
  await ctx.plugin(McpManager)
  return { ctx, registry: ctx.mcpRegistry, manager: ctx.mcpManager }
}

describe('McpManager', () => {
  it('reports disabled for a disabled server and holds no connection', async () => {
    const { registry, manager } = await harness()
    await registry.create({ transport: 'stdio', serverName: 'off', command: 'none', enabled: false })
    await manager.sync()
    expect(manager.states()).toEqual([{ id: expect.anything(), status: 'disabled' }])
  })

  it('starts an enabled server and settles a failed initial connection', async () => {
    const { registry, manager } = await harness()
    const server = await registry.create({
      transport: 'stdio', serverName: 'dead', command: 'definitely-not-a-real-command', failOnStartupError: false,
    })
    await manager.sync()
    await vi.waitFor(() => {
      expect(manager.states()[0]).toMatchObject({ id: server.id, status: 'failed' })
    })
  })

  it('stops a connection when the server is disabled and removes it on delete', async () => {
    const { registry, manager } = await harness()
    const server = await registry.create({
      transport: 'stdio', serverName: 'dead2', command: 'definitely-not-a-real-command', failOnStartupError: false,
    })
    await manager.sync()
    await vi.waitFor(() => { expect(manager.states()[0].status).toBe('failed') })

    await registry.update(server.id, {
      transport: 'stdio', serverName: 'dead2', command: 'definitely-not-a-real-command', enabled: false,
    })
    await manager.sync()
    expect(manager.states()[0].status).toBe('disabled')

    await registry.delete(server.id)
    await manager.sync()
    expect(manager.states()).toEqual([])
  })
})
