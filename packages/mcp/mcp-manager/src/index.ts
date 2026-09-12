/**
 * MCP server manager (`ctx.mcpManager`): holds one supervised MCP connection
 * per enabled registry record, starting and stopping them as the registry
 * changes, so a user can add and remove servers at runtime without editing the
 * composition. Connection, reconnect, and tool-registration logic are reused
 * from `@deepseek-ai/dsh-mcp-client` (`startConnection`), not duplicated here.
 */
import { Context, Service } from '@deepseek-ai/cordis'
import {
  resolveReconnectPolicy,
  startConnection,
  type Config as McpClientConfig,
  type ConnectionHandle,
} from '@deepseek-ai/dsh-mcp-client'
import type { McpServer, McpServerId } from '@deepseek-ai/dsh-mcp-registry'
import type { McpServerStatus } from './status.ts'

export type { McpServerStatus } from './status.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    mcpManager: McpManager
  }
}

/** Map one registry record to the MCP client's resolved config, dropping registry-only fields. */
function clientConfigOf(server: McpServer): McpClientConfig {
  if (server.transport === 'stdio') {
    return {
      transport: 'stdio',
      serverName: server.serverName,
      command: server.command,
      args: [...server.args],
      env: { ...server.env },
      cwd: server.cwd,
      toolCallTimeoutMs: server.toolCallTimeoutMs,
      failOnStartupError: server.failOnStartupError,
      ...(server.reconnect !== undefined ? { reconnect: server.reconnect } : {}),
    }
  }
  return {
    transport: 'streamable-http',
    serverName: server.serverName,
    url: server.url,
    headers: { ...server.headers },
    toolCallTimeoutMs: server.toolCallTimeoutMs,
    failOnStartupError: server.failOnStartupError,
    ...(server.reconnect !== undefined ? { reconnect: server.reconnect } : {}),
  }
}

/** Stringify a thrown connection error without the Object default form. */
function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  try {
    return JSON.stringify(error)
  } catch {
    return 'unknown error'
  }
}

interface LiveEntry {
  readonly handle: ConnectionHandle
  status: McpServerStatus['status']
  error?: string | undefined
}

/** Holds live MCP connections keyed by registry id, one per enabled server. */
export class McpManager extends Service {
  static inject = ['mcpRegistry', 'tools']

  private readonly live = new Map<McpServerId, LiveEntry>()
  private syncTail: Promise<void> = Promise.resolve()

  constructor(ctx: Context) {
    super(ctx, 'mcpManager')
  }

  /** Watch the registry and hold connections for its enabled servers. */
  protected async [Service.init](): Promise<void> {
    this.ctx.effect(() => {
      const off = this.ctx.on('domain/changed', (change) => {
        if (change.domain === 'mcp') void this.sync()
      })
      return () => off()
    }, 'mcp-manager.domainWatch')
    this.ctx.effect(() => () => this.disposeAll(), 'mcp-manager.dispose')
    await this.sync()
  }

  /**
   * Reconcile live connections with the registry: start enabled, stop removed
   * or disabled. Public so the mutation path re-syncs deterministically after
   * a write, independent of event propagation to a sibling context.
   */
  sync(): Promise<void> {
    const run = this.syncTail.then(() => this.reconcile(), () => this.reconcile())
    this.syncTail = run.then(() => undefined, () => undefined)
    return run
  }

  private async reconcile(): Promise<void> {
    const servers = this.ctx.mcpRegistry.list()
    const wanted = new Set(servers.filter(server => server.enabled).map(server => server.id))

    for (const [id, entry] of this.live) {
      if (!wanted.has(id)) {
        await entry.handle.dispose()
        this.live.delete(id)
      }
    }

    for (const server of servers) {
      if (!server.enabled || this.live.has(server.id)) continue
      const handle = startConnection(
        this.ctx,
        clientConfigOf(server),
        resolveReconnectPolicy(server.reconnect, `mcp-manager(${server.serverName}): reconnect`),
      )
      const entry: LiveEntry = { handle, status: 'starting' }
      this.live.set(server.id, entry)
      void handle.ready.then((outcome) => {
        const current = this.live.get(server.id)
        if (current !== entry) return
        if (outcome.error === undefined) {
          current.status = 'connected'
          current.error = undefined
        } else {
          current.status = 'failed'
          current.error = errorMessage(outcome.error)
        }
      })
    }
  }

  private async disposeAll(): Promise<void> {
    const pending = [...this.live.values()].map(entry => entry.handle.dispose())
    this.live.clear()
    await Promise.all(pending)
  }

  /** Coarse per-server connection state; a later reconnect drop is not reflected here. */
  states(): readonly McpServerStatus[] {
    const servers = this.ctx.mcpRegistry.list()
    return servers.map((server) => {
      const entry = this.live.get(server.id)
      if (entry === undefined) return { id: server.id, status: 'disabled' }
      return {
        id: server.id,
        status: entry.status,
        ...(entry.error === undefined ? {} : { error: entry.error }),
      }
    })
  }
}

export default McpManager
