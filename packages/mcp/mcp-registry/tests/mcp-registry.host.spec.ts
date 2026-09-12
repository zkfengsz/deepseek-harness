/** Host-side MCP server registry coverage over the in-memory domain. */
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Storage from '@deepseek-ai/dsh-storage'
import { DomainFacility } from '@deepseek-ai/dsh-storage-domain'
import McpRegistry from '../src/index.ts'
import { MemoryStorageBackend } from '../../../storage/storage-domain/tests/helpers/memory-backend.ts'

const roots: Context[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map(ctx => ctx.fiber.dispose()))
})

async function harness(): Promise<{ registry: McpRegistry }> {
  const ctx = new Context()
  roots.push(ctx)
  await ctx.plugin(Storage)
  ctx.storage.backend.register('memory', new MemoryStorageBackend())
  const storageDomain = new DomainFacility(ctx, { backend: 'memory', routes: {} })
  ctx.storage.mount('domain', storageDomain)
  ctx.provide('storageDomain', storageDomain)
  await ctx.plugin(McpRegistry)
  return { registry: ctx.mcpRegistry }
}

const stdio = { transport: 'stdio', serverName: 'files', command: 'npx' } as const
const http = { transport: 'streamable-http', serverName: 'risk', url: 'https://mcp.example' } as const

describe('McpRegistry', () => {
  it('creates and lists servers in append order, filling stdio defaults', async () => {
    const { registry } = await harness()
    const first = await registry.create({ ...stdio })
    const second = await registry.create({ ...http })
    expect(registry.list().map(server => server.serverName)).toEqual(['files', 'risk'])
    expect(registry.get(first.id)).toEqual(first)
    expect(first).toMatchObject({
      transport: 'stdio', enabled: true, toolCallTimeoutMs: 60_000, failOnStartupError: false,
      args: [], env: {}, cwd: '',
    })
    expect(second).toMatchObject({ transport: 'streamable-http', headers: {} })
  })

  it('updates a server in place and keeps its id and position', async () => {
    const { registry } = await harness()
    const first = await registry.create({ ...stdio })
    await registry.create({ ...http })
    const updated = await registry.update(first.id, { ...http, serverName: 'risk2' })
    expect(updated.id).toBe(first.id)
    expect(updated.transport).toBe('streamable-http')
    expect(registry.list().map(server => server.serverName)).toEqual(['risk2', 'risk'])
  })

  it('rejects an update of an unknown id', async () => {
    const { registry } = await harness()
    await expect(registry.update('missing' as never, { ...stdio })).rejects.toThrow(/unknown server/)
  })

  it('deletes servers idempotently', async () => {
    const { registry } = await harness()
    const server = await registry.create({ ...stdio })
    expect(await registry.delete(server.id)).toBe(true)
    expect(registry.get(server.id)).toBeUndefined()
    expect(await registry.delete(server.id)).toBe(false)
  })

  it('preserves an explicitly disabled server in the list', async () => {
    const { registry } = await harness()
    const server = await registry.create({ ...stdio, enabled: false })
    expect(registry.get(server.id)?.enabled).toBe(false)
  })
})
