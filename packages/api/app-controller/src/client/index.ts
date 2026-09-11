/** React-free Client WorkBro application service over the `app` Remote namespace. */
import { Service, type Context } from '@deepseek-ai/cordis'
import type { AppId } from '@deepseek-ai/dsh-app-registry'
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace/types'
import type { AppView } from '../types.ts'

export type { AppId } from '@deepseek-ai/dsh-app-registry'
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

  constructor(ctx: Context) {
    super(ctx, 'apps')
    void this.refresh()
  }

  private refresh(): Promise<void> {
    return this.ctx.remote.app.list().then((value) => {
      this.snapshot = { apps: value.apps }
      for (const listener of this.listeners) listener()
    })
  }

  async create(input: Parameters<IApps['create']>[0]): Promise<AppView> {
    const value = await this.ctx.remote.app.create(input)
    await this.refresh()
    return value.app
  }

  async rename(appId: AppId, name: string): Promise<AppView> {
    const value = await this.ctx.remote.app.rename({ appId, name })
    await this.refresh()
    return value.app
  }

  async bindWorkspace(appId: AppId, workspaceId?: WorkspaceId): Promise<AppView> {
    const value = await this.ctx.remote.app.bindWorkspace({ appId, workspaceId })
    await this.refresh()
    return value.app
  }

  async delete(appId: AppId): Promise<void> {
    await this.ctx.remote.app.delete({ appId })
    await this.refresh()
  }
}

/** Install Client WorkBro application state and commands. */
export function apply(ctx: Context): void {
  new AppsService(ctx)
}
