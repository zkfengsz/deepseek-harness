/** Host-side `workbro.app.yml` manifest reader coverage. */
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { readAppManifest } from '../src/manifest.ts'

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'workbro-app-'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('readAppManifest', () => {
  it('returns undefined when no manifest exists', async () => {
    await expect(readAppManifest(dir)).resolves.toBeUndefined()
  })

  it('parses a valid manifest', async () => {
    await writeFile(join(dir, 'workbro.app.yml'), 'name: 合规巡检台\nicon: 🛡️\ndescription: 批量制裁筛查\npreset: compliance\n', 'utf8')
    await expect(readAppManifest(dir)).resolves.toEqual({
      name: '合规巡检台', icon: '🛡️', description: '批量制裁筛查', preset: 'compliance',
    })
  })

  it('returns undefined for a malformed document', async () => {
    await writeFile(join(dir, 'workbro.app.yml'), 'name: [unclosed\n', 'utf8')
    await expect(readAppManifest(dir)).resolves.toBeUndefined()
  })

  it('returns undefined for a non-mapping document', async () => {
    await writeFile(join(dir, 'workbro.app.yml'), 'just a scalar\n', 'utf8')
    await expect(readAppManifest(dir)).resolves.toBeUndefined()
  })

  it('ignores non-string and empty fields', async () => {
    await writeFile(join(dir, 'workbro.app.yml'), 'name: 123\nicon: ""\n', 'utf8')
    await expect(readAppManifest(dir)).resolves.toBeUndefined()
  })

  it('serves the cached manifest while the file is unchanged', async () => {
    await writeFile(join(dir, 'workbro.app.yml'), 'name: cached\n', 'utf8')
    const first = await readAppManifest(dir)
    const second = await readAppManifest(dir)
    expect(first).toEqual({ name: 'cached' })
    expect(second).toEqual({ name: 'cached' })
  })
})
