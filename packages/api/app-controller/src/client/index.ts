/** React-free Client WorkBro application service over the `app` Remote namespace. */
import { Service, type Context } from '@deepseek-ai/cordis'
// Type-only: pull the Client Remote face (ctx.remote) and its app namespace.
import type { ClientRemote } from '@deepseek-ai/dsh-api-gateway/client'
import type {} from '@deepseek-ai/dsh-api-app-controller/remote'
import type { AppId } from '@deepseek-ai/dsh-app-registry/types'
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace/types'
import type { AppView } from '../types.ts'

export type { AppId } from '@deepseek-ai/dsh-app-registry/types'
export type { AppView } from '../types.ts'

/** Snapshot of the complete app list. */
export interface AppSnapshot {
  readonly apps: readonly AppView[]
}

/** Bare observable source for the app snapshot. */
export interface AppSource {
  getSnapshot(): AppSnapshot
  subscribe(listener: () => void): () => void
}

/** The mounted `app` Remote namespace. */
type AppRemote = ClientRemote['app']

/** WorkBro application Client service face. */
export interface IApps {
  readonly list: AppSource
  create(input: { name: string; icon?: string; description?: string; preset?: string; workspaceId?: WorkspaceId }): Promise<AppView>
  rename(appId: AppId, name: string): Promise<AppView>
  bindWorkspace(appId: AppId, workspaceId?: WorkspaceId): Promise<AppView>
  delete(appId: AppId): Promise<void>
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** React-free Client WorkBro application state and commands. */
    apps: IApps
  }
}

/** Required Client Remote services. */
export const inject = ['remote', 'remote.app']

/** Unwrap a Remote result, throwing its business failure as an Error. */
function unwrap<T>(result: { ok: true; value: T } | { ok: false; error: { message: string } }): T {
  if (!result.ok) throw new Error(result.error.message)
  return result.value
}

/** Owns the bare app snapshot and app commands, refreshing after each mutation. */
export class AppsService extends Service implements IApps {
  private snapshot: AppSnapshot = { apps: [] }
  private readonly listeners = new Set<() => void>()

  readonly list: AppSource = {
    getSnapshot: () => this.snapshot,
    subscribe: (listener) => {
      this.listeners.add(listener)
      return () => { this.listeners.delete(listener) }
    },
  }

  constructor(ctx: Context, private readonly remoteApp: AppRemote) {
    super(ctx, 'apps')
    void this.refresh()
  }

  private refresh(): Promise<void> {
    return this.remoteApp.list().then((result) => {
      this.snapshot = { apps: unwrap(result).apps }
      for (const listener of this.listeners) listener()
    })
  }

  async create(input: Parameters<IApps['create']>[0]): Promise<AppView> {
    const value = unwrap(await this.remoteApp.create(input))
    await this.refresh()
    return value.app
  }

  async rename(appId: AppId, name: string): Promise<AppView> {
    const value = unwrap(await this.remoteApp.rename({ appId, name }))
    await this.refresh()
    return value.app
  }

  async bindWorkspace(appId: AppId, workspaceId?: WorkspaceId): Promise<AppView> {
    const value = unwrap(await this.remoteApp.bindWorkspace({ appId, workspaceId }))
    await this.refresh()
    return value.app
  }

  async delete(appId: AppId): Promise<void> {
    unwrap(await this.remoteApp.delete({ appId }))
    await this.refresh()
  }
}

/** Install Client WorkBro application state and commands. */
export function apply(ctx: Context): void {
  new AppsService(ctx, ctx.remote.app)
}
