import { Context, Service } from '@deepseek-ai/cordis'
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace/types'
import type { App, AppId as AppIdBrand } from './types.ts'
export type { App } from './types.ts'
export { appDomainSpec, appDomainState, appRecord } from './spec.ts'
export type { AppDomainState, AppRecord } from './spec.ts'
/** The app id brand, re-exported under its public name. */
export type AppId = AppIdBrand
/** Brand a string as an {@link AppId}. */
export declare function AppId(id: string): AppId
/** Input for creating a WorkBro application. */
export interface AppCreateInput {
  name: string
  icon?: string | undefined
  description?: string | undefined
  preset?: string | undefined
  workspaceId?: WorkspaceId | undefined
}
declare module '@deepseek-ai/cordis' {
  interface Context {
    appRegistry: AppRegistry
  }
}
/** Durable WorkBro application registry over the domain data form. */
export declare class AppRegistry extends Service {
  static inject: string[]
  private table?
  private global?
  private state?
  private readonly apps
  private operationTail
  constructor(ctx: Context)
  /** Open the domain, initialize on first use, and rebuild the ordered cache. */
  protected [Service.init](): Promise<void>
  private requireState
  private requireTable
  private requireGlobal
  private setState
  private rebuild
  private enqueue
  /** Ordered app projection in durable registry order. */
  list(): App[]
  /** Look up one app by id. */
  get(id: AppId): App | undefined
  /** Create one app and prepend it to the durable order. */
  create(input: AppCreateInput): Promise<App>
  /** Rename one app durably. */
  rename(id: AppId, name: string): Promise<App>
  /** Bind or unbind a workspace as the app's data context. */
  bindWorkspace(id: AppId, workspaceId?: WorkspaceId): Promise<App>
  /** Delete one app registration. Unknown ids are an idempotent no-op. */
  delete(id: AppId): Promise<boolean>
  /** Move one app within the durable display order, DOM-insertBefore-like. */
  insertBefore(id: AppId, beforeId?: AppId): Promise<readonly AppId[]>
}
export default AppRegistry
//# sourceMappingURL=index.d.ts.map
