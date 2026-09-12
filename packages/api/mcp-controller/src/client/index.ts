/** React-free Client MCP server service over the `mcp` Remote namespace. */
import { Service, type Context } from '@deepseek-ai/cordis'
// Type-only: pull the Client Remote face (ctx.remote) and its mcp namespace.
import type { ClientRemote } from '@deepseek-ai/dsh-api-gateway/client'
import type {} from '@deepseek-ai/dsh-api-mcp-controller/remote'
import type { McpServerId } from '@deepseek-ai/dsh-mcp-registry/types'
import type { McpServerCreateRequest, McpServerView } from '../types.ts'

export type { McpServerId } from '@deepseek-ai/dsh-mcp-registry/types'
export type { McpServerConnectionStatus, McpServerCreateRequest, McpServerView } from '../types.ts'

/** Snapshot of the complete MCP server list. */
export interface McpServerSnapshot {
  readonly servers: readonly McpServerView[]
}

/** Bare observable source for the MCP server snapshot. */
export interface McpServerSource {
  getSnapshot(): McpServerSnapshot
  subscribe(listener: () => void): () => void
}

/** The mounted `mcp` Remote namespace. */
type McpRemote = ClientRemote['mcp']

/** MCP server Client service face. */
export interface IMcpServers {
  readonly list: McpServerSource
  create(input: McpServerCreateRequest): Promise<McpServerView>
  update(id: McpServerId, input: McpServerCreateRequest): Promise<McpServerView>
  delete(id: McpServerId): Promise<void>
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** React-free Client MCP server state and commands. */
    mcpServers: IMcpServers
  }
}

/** Required Client Remote services. */
export const inject = ['remote', 'remote.mcp']

/** Unwrap a Remote result, throwing its business failure as an Error. */
function unwrap<T>(result: { ok: true; value: T } | { ok: false; error: { message: string } }): T {
  if (!result.ok) throw new Error(result.error.message)
  return result.value
}

/** Owns the bare MCP server snapshot and commands, refreshing after each mutation. */
export class McpServersService extends Service implements IMcpServers {
  private snapshot: McpServerSnapshot = { servers: [] }
  private readonly listeners = new Set<() => void>()

  readonly list: McpServerSource = {
    getSnapshot: () => this.snapshot,
    subscribe: (listener) => {
      this.listeners.add(listener)
      return () => { this.listeners.delete(listener) }
    },
  }

  constructor(ctx: Context, private readonly remoteMcp: McpRemote) {
    super(ctx, 'mcpServers')
    void this.refresh()
  }

  private refresh(): Promise<void> {
    return this.remoteMcp.list().then((result) => {
      this.snapshot = { servers: unwrap(result).servers }
      for (const listener of this.listeners) listener()
    })
  }

  async create(input: McpServerCreateRequest): Promise<McpServerView> {
    const value = unwrap(await this.remoteMcp.create(input))
    await this.refresh()
    return value.server
  }

  async update(id: McpServerId, input: McpServerCreateRequest): Promise<McpServerView> {
    const value = unwrap(await this.remoteMcp.update({ id, ...input }))
    await this.refresh()
    return value.server
  }

  async delete(id: McpServerId): Promise<void> {
    unwrap(await this.remoteMcp.delete({ id }))
    await this.refresh()
  }
}

/** Install Client MCP server state and commands. */
export function apply(ctx: Context): void {
  new McpServersService(ctx, ctx.remote.mcp)
}
