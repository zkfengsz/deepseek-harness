/**
 * WorkBro application registry (`ctx.appRegistry`): durable first-class app
 * records (name, icon, description, preset, optional workspace binding) over
 * the domain data form.
 */
import { randomUUID } from 'node:crypto'
import { Context, Service } from '@deepseek-ai/cordis'
import type { DomainGlobal, KvTable } from '@deepseek-ai/dsh-storage-domain'
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace/types'
import { appDomainSpec } from './spec.ts'
import type { AppDomainState, AppRecord } from './spec.ts'
import type { App, AppId as AppIdBrand } from './types.ts'

export type { App } from './types.ts'
export { appDomainSpec, appDomainState, appRecord } from './spec.ts'
export type { AppDomainState, AppRecord } from './spec.ts'

/** The app id brand, re-exported under its public name. */
export type AppId = AppIdBrand

/** Brand a string as an {@link AppId}. */
export function AppId(id: string): AppId {
  return id as AppId
}

/** Input for creating a WorkBro application. */
export interface AppCreateInput {
  name: string
  icon?: string | undefined
  description?: string | undefined
  preset?: string | undefined
  workspaceId?: WorkspaceId | undefined
}

/** Project one durable record into its consumer-facing app. */
function appOf(id: AppId, record: AppRecord): App {
  return { id, ...record }
}

/** Build a durable record from create input, dropping absent optional fields. */
function recordOf(input: AppCreateInput): AppRecord {
  return {
    name: input.name,
    ...(input.icon !== undefined ? { icon: input.icon } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.preset !== undefined ? { preset: input.preset } : {}),
    ...(input.workspaceId !== undefined ? { workspaceId: input.workspaceId } : {}),
  }
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    appRegistry: AppRegistry
  }
}

const sameIds = (left: readonly AppId[], right: readonly AppId[]): boolean =>
  left.length === right.length && left.every((id, index) => id === right[index])

/** Durable WorkBro application registry over the domain data form. */
export class AppRegistry extends Service {
  static inject = ['storageDomain']

  private table?: KvTable<AppId, AppRecord>
  private global?: DomainGlobal<AppDomainState>
  private state?: AppDomainState
  private readonly apps = new Map<AppId, App>()
  private operationTail: Promise<void> = Promise.resolve()

  constructor(ctx: Context) {
    super(ctx, 'appRegistry')
  }

  /** Open the domain, initialize on first use, and rebuild the ordered cache. */
  protected async [Service.init](): Promise<void> {
    const domain = await this.ctx.storageDomain.open(appDomainSpec)
    this.ctx.effect(() => () => domain.close(), 'app-registry.domainClose')
    this.table = domain.table('apps')
    this.global = domain.global
    this.state = domain.global.get()
    if (!this.state.initialized) {
      await this.setState({ initialized: true, appIds: [] })
    }
    this.rebuild()
  }

  private requireState(): AppDomainState {
    if (this.state === undefined) throw new Error('app registry not initialized')
    return this.state
  }

  private requireTable(): KvTable<AppId, AppRecord> {
    if (this.table === undefined) throw new Error('app registry table unavailable')
    return this.table
  }

  private requireGlobal(): DomainGlobal<AppDomainState> {
    if (this.global === undefined) throw new Error('app registry global unavailable')
    return this.global
  }

  private async setState(state: AppDomainState): Promise<void> {
    await this.requireGlobal().set(state)
    this.state = state
  }

  private rebuild(): void {
    this.apps.clear()
    for (const id of this.requireState().appIds) {
      const record = this.requireTable().get(id)
      if (record === undefined) throw new Error(`app registry order references missing app '${id}'`)
      this.apps.set(id, appOf(id, record))
    }
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.operationTail.then(operation, operation)
    this.operationTail = result.then(() => undefined, () => undefined)
    return result
  }

  /** Ordered app projection in durable registry order. */
  list(): App[] {
    return this.requireState().appIds.map((id) => {
      const app = this.apps.get(id)
      if (app === undefined) throw new Error(`app registry order references missing app '${id}'`)
      return app
    })
  }

  /** Look up one app by id. */
  get(id: AppId): App | undefined {
    return this.apps.get(id)
  }

  /** Create one app and prepend it to the durable order. */
  create(input: AppCreateInput): Promise<App> {
    return this.enqueue(async () => {
      const id = AppId(randomUUID())
      const record = recordOf(input)
      await this.requireTable().put(id, record)
      await this.setState({ ...this.requireState(), appIds: [id, ...this.requireState().appIds] })
      const app = appOf(id, record)
      this.apps.set(id, app)
      return app
    })
  }

  /** Rename one app durably. */
  rename(id: AppId, name: string): Promise<App> {
    return this.enqueue(async () => {
      const record = this.requireTable().get(id)
      if (record === undefined) throw new Error(`unknown app '${id}'`)
      const next = { ...record, name }
      await this.requireTable().put(id, next)
      const app = appOf(id, next)
      this.apps.set(id, app)
      return app
    })
  }

  /** Bind or unbind a workspace as the app's data context. */
  bindWorkspace(id: AppId, workspaceId?: WorkspaceId): Promise<App> {
    return this.enqueue(async () => {
      const record = this.requireTable().get(id)
      if (record === undefined) throw new Error(`unknown app '${id}'`)
      const next = workspaceId === undefined
        ? { ...record, workspaceId: undefined }
        : { ...record, workspaceId }
      await this.requireTable().put(id, next)
      const app = appOf(id, next)
      this.apps.set(id, app)
      return app
    })
  }

  /** Delete one app registration. Unknown ids are an idempotent no-op. */
  delete(id: AppId): Promise<boolean> {
    return this.enqueue(async () => {
      const state = this.requireState()
      if (!state.appIds.includes(id)) return false
      await this.requireTable().delete(id)
      await this.setState({ ...state, appIds: state.appIds.filter(appId => appId !== id) })
      this.apps.delete(id)
      return true
    })
  }

  /** Move one app within the durable display order, DOM-insertBefore-like. */
  insertBefore(id: AppId, beforeId?: AppId): Promise<readonly AppId[]> {
    return this.enqueue(async () => {
      const state = this.requireState()
      if (!state.appIds.includes(id)) throw new Error(`unknown app '${id}'`)
      if (beforeId !== undefined && !state.appIds.includes(beforeId)) {
        throw new Error(`unknown app '${beforeId}'`)
      }
      if (beforeId === id) return state.appIds
      const without = state.appIds.filter(appId => appId !== id)
      const at = beforeId === undefined ? without.length : without.indexOf(beforeId)
      const appIds = [...without.slice(0, at), id, ...without.slice(at)]
      if (sameIds(appIds, state.appIds)) return state.appIds
      await this.setState({ ...state, appIds })
      return appIds
    })
  }
}

export default AppRegistry
