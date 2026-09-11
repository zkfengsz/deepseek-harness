/** Host-side WorkBro application registry coverage over the in-memory domain. */
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Storage from '@deepseek-ai/dsh-storage'
import { DomainFacility } from '@deepseek-ai/dsh-storage-domain'
import AppRegistry from '../src/index.ts'
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
  await ctx.plugin(AppRegistry)
  return { ctx, registry: ctx.appRegistry }
}

describe('AppRegistry', () => {
  it('creates and lists apps in newest-first order', async () => {
    const { registry } = await harness()
    const first = await registry.create({ name: '合规巡检台', icon: '🛡️', preset: 'compliance' })
    const second = await registry.create({ name: '拓客', description: '找客户' })
    expect(registry.list().map(app => app.name)).toEqual(['拓客', '合规巡检台'])
    expect(registry.get(first.id)).toEqual(first)
    expect(registry.get(second.id)).toEqual(second)
  })

  it('renames and rebinds a workspace', async () => {
    const { registry } = await harness()
    const app = await registry.create({ name: 'a' })
    expect((await registry.rename(app.id, 'b')).name).toBe('b')
    expect((await registry.bindWorkspace(app.id, 'ws-1' as never)).workspaceId).toBe('ws-1')
    expect((await registry.bindWorkspace(app.id)).workspaceId).toBeUndefined()
  })

  it('deletes apps idempotently', async () => {
    const { registry } = await harness()
    const app = await registry.create({ name: 'a' })
    expect(await registry.delete(app.id)).toBe(true)
    expect(registry.get(app.id)).toBeUndefined()
    expect(await registry.delete(app.id)).toBe(false)
  })

  it('reorders apps', async () => {
    const { registry } = await harness()
    const first = await registry.create({ name: 'a' })
    const second = await registry.create({ name: 'b' })
    await expect(registry.insertBefore(second.id, first.id)).resolves.toEqual([second.id, first.id])
  })
})
