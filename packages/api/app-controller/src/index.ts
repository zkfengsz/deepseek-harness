/** Host WorkBro application Remote owner: explicit commands over the app registry. */
import { Context } from '@deepseek-ai/cordis'
import type { App } from '@deepseek-ai/dsh-app-registry'
import { AppId } from '@deepseek-ai/dsh-app-registry'
import { Remote, RemoteError, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import type {
  AppBindWorkspaceRequest,
  AppBindWorkspaceValue,
  AppCreateRequest,
  AppCreateValue,
  AppDeleteRequest,
  AppDeleteValue,
  AppInsertBeforeRequest,
  AppInsertBeforeValue,
  AppListValue,
  AppRenameRequest,
  AppRenameValue,
  AppView,
} from './types.ts'

export type * from './types.ts'

/** Project one authoritative app into its Remote value. */
function appView(app: App): AppView {
  return {
    appId: app.id,
    name: app.name,
    icon: app.icon,
    description: app.description,
    preset: app.preset,
    workspaceId: app.workspaceId,
  }
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    appController: AppController
  }
}

/** Host service backing the generated `ctx.remote.app` namespace. */
export class AppController extends TypertRemoteService {
  static inject = ['typert', 'appRegistry']

  constructor(ctx: Context) {
    super(ctx, 'appController', { namespace: 'app' })
  }

  /** The complete durable app list in registry order. */
  @Remote('list')
  async list(): Promise<AppListValue> {
    return { apps: this.ctx.appRegistry.list().map(appView) }
  }

  /** Create one app and prepend it to the durable order. */
  @Remote('create')
  async create(request: AppCreateRequest): Promise<AppCreateValue> {
    const app = await this.ctx.appRegistry.create(request)
    return { app: appView(app) }
  }

  /** Rename one app. */
  @Remote('rename')
  async rename(request: AppRenameRequest): Promise<AppRenameValue> {
    return { app: appView(await this.renameOrFail(request.appId, request.name)) }
  }

  /** Bind or unbind a workspace as the app's data context. */
  @Remote('bindWorkspace')
  async bindWorkspace(request: AppBindWorkspaceRequest): Promise<AppBindWorkspaceValue> {
    const app = await this.ctx.appRegistry.bindWorkspace(AppId(request.appId), request.workspaceId)
    return { app: appView(app) }
  }

  /** Delete one app registration. */
  @Remote('delete')
  async delete(request: AppDeleteRequest): Promise<AppDeleteValue> {
    if (!await this.ctx.appRegistry.delete(AppId(request.appId))) {
      throw appNotFound(request.appId)
    }
    return { deleted: true }
  }

  /** Move one app within the durable display order. */
  @Remote('insertBefore')
  async insertBefore(request: AppInsertBeforeRequest): Promise<AppInsertBeforeValue> {
    try {
      const appIds = await this.ctx.appRegistry.insertBefore(
        AppId(request.appId),
        request.beforeAppId === undefined ? undefined : AppId(request.beforeAppId),
      )
      return { appIds: [...appIds] }
    } catch (error) {
      if (!(error instanceof Error) || !error.message.startsWith('unknown app')) throw error
      throw appNotFound(request.appId)
    }
  }

  private async renameOrFail(appId: string, name: string): Promise<App> {
    try {
      return await this.ctx.appRegistry.rename(AppId(appId), name)
    } catch (error) {
      if (!(error instanceof Error) || !error.message.startsWith('unknown app')) throw error
      throw appNotFound(appId)
    }
  }
}

function appNotFound(appId: string): RemoteError<'app/not-found'> {
  return new RemoteError('app/not-found', `App "${appId}" not found`, { appId: AppId(appId) })
}

export default AppController
