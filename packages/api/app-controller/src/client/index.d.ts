/** React-free Client WorkBro application service over the `app` Remote namespace. */
import { Service, type Context } from '@deepseek-ai/cordis'
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
/** WorkBro application Client service face. */
export interface IApps {
  readonly list: AppSource
  create(input: {
    name: string
    icon?: string
    description?: string
    preset?: string
    workspaceId?: WorkspaceId
  }): Promise<AppView>
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
export declare const inject: string[]
/** Owns the bare app snapshot and app commands, refreshing after each mutation. */
export declare class AppsService extends Service implements IApps {
  private snapshot
  private readonly listeners
  readonly list: AppSource
  constructor(ctx: Context)
  private refresh
  create(input: Parameters<IApps['create']>[0]): Promise<AppView>
  rename(appId: AppId, name: string): Promise<AppView>
  bindWorkspace(appId: AppId, workspaceId?: WorkspaceId): Promise<AppView>
  delete(appId: AppId): Promise<void>
}
/** Install Client WorkBro application state and commands. */
export declare function apply(ctx: Context): void
//# sourceMappingURL=index.d.ts.map
