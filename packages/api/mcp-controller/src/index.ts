/** Host MCP server Remote owner: explicit commands over the registry and manager. */
import { Context } from '@deepseek-ai/cordis'
import type { McpServer, McpServerCreateInput, McpServerId } from '@deepseek-ai/dsh-mcp-registry'
// Side-effect type imports: pull each service's Context augmentation into this program.
import type {} from '@deepseek-ai/dsh-mcp-manager'
import type {} from '@deepseek-ai/dsh-mcp-registry'
import { Remote, RemoteError, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import type {
  McpServerCreateRequest,
  McpServerDeleteRequest,
  McpServerDeleteValue,
  McpServerListValue,
  McpServerUpdateRequest,
  McpServerValue,
  McpServerView,
} from './types.ts'

export type * from './types.ts'

/** Project one authoritative server plus its live status into its Remote value. */
function viewOf(server: McpServer, status: McpServerView['status'], error?: string): McpServerView {
  return {
    id: server.id,
    serverName: server.serverName,
    enabled: server.enabled,
    transport: server.transport,
    toolCallTimeoutMs: server.toolCallTimeoutMs,
    failOnStartupError: server.failOnStartupError,
    ...(server.reconnect !== undefined ? { reconnect: server.reconnect } : {}),
    ...(server.transport === 'stdio'
      ? { command: server.command, args: [...server.args], env: { ...server.env }, cwd: server.cwd }
      : { url: server.url, headers: { ...server.headers } }),
    status,
    ...(error === undefined ? {} : { error }),
  }
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    mcpController: McpController
  }
}

/** Validate the flat wire request into the registry's discriminated create input. */
function createInputOf(request: McpServerCreateRequest): McpServerCreateInput {
  const base = {
    serverName: request.serverName,
    ...(request.enabled !== undefined ? { enabled: request.enabled } : {}),
    ...(request.toolCallTimeoutMs !== undefined ? { toolCallTimeoutMs: request.toolCallTimeoutMs } : {}),
    ...(request.failOnStartupError !== undefined ? { failOnStartupError: request.failOnStartupError } : {}),
    ...(request.reconnect !== undefined ? { reconnect: request.reconnect } : {}),
  }
  if (request.transport === 'stdio') {
    if (request.command === undefined) {
      throw new RemoteError('gateway/bad-request', 'stdio MCP servers require a command', {})
    }
    return {
      ...base,
      transport: 'stdio',
      command: request.command,
      ...(request.args !== undefined ? { args: request.args } : {}),
      ...(request.env !== undefined ? { env: request.env } : {}),
      ...(request.cwd !== undefined ? { cwd: request.cwd } : {}),
    }
  }
  if (request.url === undefined) {
    throw new RemoteError('gateway/bad-request', 'streamable-http MCP servers require a url', {})
  }
  return {
    ...base,
    transport: 'streamable-http',
    url: request.url,
    ...(request.headers !== undefined ? { headers: request.headers } : {}),
  }
}

/** Host service backing the generated `ctx.remote.mcp` namespace. */
export class McpController extends TypertRemoteService {
  static inject = ['typert', 'mcpRegistry', 'mcpManager']

  constructor(ctx: Context) {
    super(ctx, 'mcpController', { namespace: 'mcp' })
  }

  private view(id: McpServerId): McpServerView {
    const server = this.ctx.mcpRegistry.get(id)
    if (server === undefined) throw appNotFound(id)
    const state = this.ctx.mcpManager.states().find(entry => entry.id === id)
    return viewOf(server, state?.status ?? 'disabled', state?.error)
  }

  /** The complete MCP server list with live status, in registry order. */
  @Remote('list')
  list(): Promise<McpServerListValue> {
    return Promise.resolve({
      servers: this.ctx.mcpRegistry.list().map((server) => {
        const state = this.ctx.mcpManager.states().find(entry => entry.id === server.id)
        return viewOf(server, state?.status ?? 'disabled', state?.error)
      }),
    })
  }

  /** Create one MCP server. */
  @Remote('create')
  async create(request: McpServerCreateRequest): Promise<McpServerValue> {
    const server = await this.ctx.mcpRegistry.create(createInputOf(request))
    await this.ctx.mcpManager.sync()
    return { server: this.view(server.id) }
  }

  /** Replace one MCP server's configuration. */
  @Remote('update')
  async update(request: McpServerUpdateRequest): Promise<McpServerValue> {
    const server = await this.ctx.mcpRegistry.update(request.id, createInputOf(request))
    await this.ctx.mcpManager.sync()
    return { server: this.view(server.id) }
  }

  /** Delete one MCP server. */
  @Remote('delete')
  async delete(request: McpServerDeleteRequest): Promise<McpServerDeleteValue> {
    if (!await this.ctx.mcpRegistry.delete(request.id)) {
      throw appNotFound(request.id)
    }
    await this.ctx.mcpManager.sync()
    return { deleted: true }
  }
}

function appNotFound(id: McpServerId): RemoteError<'mcp/not-found'> {
  return new RemoteError('mcp/not-found', `MCP server "${id}" not found`, { id })
}

export default McpController
