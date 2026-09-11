/** WorkBro application Remote vocabulary. */
import type { AppId } from '@deepseek-ai/dsh-app-registry/types'
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace/types'
export type { AppId } from '@deepseek-ai/dsh-app-registry/types'
/** One WorkBro application projected for browser consumers. */
export interface AppView {
  readonly appId: AppId
  readonly name: string
  readonly icon?: string | undefined
  readonly description?: string | undefined
  readonly preset?: string | undefined
  readonly workspaceId?: WorkspaceId | undefined
}
/** Complete app list projection. */
export interface AppListValue {
  readonly apps: readonly AppView[]
}
/** Create one app. */
export interface AppCreateRequest {
  readonly name: string
  readonly icon?: string | undefined
  readonly description?: string | undefined
  readonly preset?: string | undefined
  readonly workspaceId?: WorkspaceId | undefined
}
/** Created app projection. */
export interface AppCreateValue {
  readonly app: AppView
}
/** Rename one app. */
export interface AppRenameRequest {
  readonly appId: AppId
  readonly name: string
}
/** Renamed app projection. */
export interface AppRenameValue {
  readonly app: AppView
}
/** Bind or unbind a workspace as the app's data context. */
export interface AppBindWorkspaceRequest {
  readonly appId: AppId
  readonly workspaceId?: WorkspaceId | undefined
}
/** Rebound app projection. */
export interface AppBindWorkspaceValue {
  readonly app: AppView
}
/** Delete one app. */
export interface AppDeleteRequest {
  readonly appId: AppId
}
/** Deletion confirmation. */
export interface AppDeleteValue {
  readonly deleted: boolean
}
/** Reorder one app. */
export interface AppInsertBeforeRequest {
  readonly appId: AppId
  readonly beforeAppId?: AppId | undefined
}
/** Resulting durable app order. */
export interface AppInsertBeforeValue {
  readonly appIds: readonly AppId[]
}
declare module '@deepseek-ai/dsh-typert-protocol' {
  interface RemoteErrorDetailsMap {
    /** No app carries that identity. */
    'app/not-found': {
      readonly appId: AppId
    }
  }
}
//# sourceMappingURL=types.d.ts.map
