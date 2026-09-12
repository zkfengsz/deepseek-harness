/**
 * MCP server registry (`ctx.mcpRegistry`): durable records of the external MCP
 * servers a user added, over the domain data form. It owns no connections —
 * the manager reads these records and holds the live sockets.
 */
import { randomUUID } from 'node:crypto'
import { Context, Service } from '@deepseek-ai/cordis'
import type { DomainGlobal, KvTable } from '@deepseek-ai/dsh-storage-domain'
import { mcpDomainSpec } from './spec.ts'
import type { McpDomainState, McpServerRecord } from './spec.ts'
import type {
  McpReconnectConfig,
  McpServer,
  McpServerId as McpServerIdBrand,
} from './types.ts'

export type { McpReconnectConfig, McpServer, McpStreamableHttpServer, McpStdioServer } from './types.ts'
export { mcpDomainSpec, mcpDomainState, mcpServerRecord, stdioServerRecord, streamableHttpServerRecord } from './spec.ts'
export type { McpDomainState, McpServerRecord } from './spec.ts'

/** The server id brand, re-exported under its public name. */
export type McpServerId = McpServerIdBrand

/** Brand a string as an {@link McpServerId}. */
export function McpServerId(id: string): McpServerId {
  return id as McpServerId
}

/** Fields shared by both transport create inputs. */
export interface McpServerCreateFields {
  serverName: string
  enabled?: boolean | undefined
  toolCallTimeoutMs?: number | undefined
  failOnStartupError?: boolean | undefined
  reconnect?: McpReconnectConfig | undefined
}

/** Stdio create input: optional fields fall back to the MCP client's defaults. */
export interface McpStdioServerCreateInput extends McpServerCreateFields {
  transport: 'stdio'
  command: string
  args?: readonly string[] | undefined
  env?: Record<string, string> | undefined
  cwd?: string | undefined
}

/** Streamable HTTP create input. */
export interface McpStreamableHttpServerCreateInput extends McpServerCreateFields {
  transport: 'streamable-http'
  url: string
  headers?: Record<string, string> | undefined
}

/** Create input for one MCP server, discriminated on transport. */
export type McpServerCreateInput = McpStdioServerCreateInput | McpStreamableHttpServerCreateInput

/** The MCP client's resolved defaults a create input omits. */
const DEFAULT_TOOL_CALL_TIMEOUT_MS = 60_000

/** Project one durable record into its consumer-facing server. */
function serverOf(id: McpServerId, record: McpServerRecord): McpServer {
  return { id, ...record }
}

/** Resolve a stdio create input into a durable record with defaults filled. */
function stdioRecordOf(input: McpStdioServerCreateInput): McpServerRecord {
  return {
    transport: 'stdio',
    serverName: input.serverName,
    enabled: input.enabled ?? true,
    toolCallTimeoutMs: input.toolCallTimeoutMs ?? DEFAULT_TOOL_CALL_TIMEOUT_MS,
    failOnStartupError: input.failOnStartupError ?? false,
    ...(input.reconnect !== undefined ? { reconnect: input.reconnect } : {}),
    command: input.command,
    args: [...(input.args ?? [])],
    env: input.env === undefined ? {} : { ...input.env },
    cwd: input.cwd ?? '',
  }
}

/** Resolve a Streamable HTTP create input into a durable record with defaults filled. */
function httpRecordOf(input: McpStreamableHttpServerCreateInput): McpServerRecord {
  return {
    transport: 'streamable-http',
    serverName: input.serverName,
    enabled: input.enabled ?? true,
    toolCallTimeoutMs: input.toolCallTimeoutMs ?? DEFAULT_TOOL_CALL_TIMEOUT_MS,
    failOnStartupError: input.failOnStartupError ?? false,
    ...(input.reconnect !== undefined ? { reconnect: input.reconnect } : {}),
    url: input.url,
    headers: input.headers === undefined ? {} : { ...input.headers },
  }
}

function recordOf(input: McpServerCreateInput): McpServerRecord {
  return input.transport === 'stdio' ? stdioRecordOf(input) : httpRecordOf(input)
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    mcpRegistry: McpRegistry
  }
}

/** Durable MCP server registry over the domain data form. */
export class McpRegistry extends Service {
  static inject = ['storageDomain']

  private table?: KvTable<McpServerId, McpServerRecord>
  private global?: DomainGlobal<McpDomainState>
  private state?: McpDomainState
  private readonly servers = new Map<McpServerId, McpServer>()
  private operationTail: Promise<void> = Promise.resolve()

  constructor(ctx: Context) {
    super(ctx, 'mcpRegistry')
  }

  /** Open the domain, initialize on first use, and rebuild the ordered cache. */
  protected async [Service.init](): Promise<void> {
    const domain = await this.ctx.storageDomain.open(mcpDomainSpec)
    this.ctx.effect(() => () => domain.close(), 'mcp-registry.domainClose')
    this.table = domain.table('servers')
    this.global = domain.global
    this.state = domain.global.get()
    if (!this.state.initialized) {
      await this.setState({ initialized: true, serverIds: [] })
    }
    this.rebuild()
  }

  private requireState(): McpDomainState {
    if (this.state === undefined) throw new Error('mcp registry not initialized')
    return this.state
  }

  private requireTable(): KvTable<McpServerId, McpServerRecord> {
    if (this.table === undefined) throw new Error('mcp registry table unavailable')
    return this.table
  }

  private requireGlobal(): DomainGlobal<McpDomainState> {
    if (this.global === undefined) throw new Error('mcp registry global unavailable')
    return this.global
  }

  private async setState(state: McpDomainState): Promise<void> {
    await this.requireGlobal().set(state)
    this.state = state
  }

  private rebuild(): void {
    this.servers.clear()
    for (const id of this.requireState().serverIds) {
      const record = this.requireTable().get(id)
      if (record === undefined) throw new Error(`mcp registry order references missing server '${id}'`)
      this.servers.set(id, serverOf(id, record))
    }
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.operationTail.then(operation, operation)
    this.operationTail = result.then(() => undefined, () => undefined)
    return result
  }

  /** Ordered server projection in durable registry order. */
  list(): McpServer[] {
    return this.requireState().serverIds.map((id) => {
      const server = this.servers.get(id)
      if (server === undefined) throw new Error(`mcp registry order references missing server '${id}'`)
      return server
    })
  }

  /** Look up one server by id. */
  get(id: McpServerId): McpServer | undefined {
    return this.servers.get(id)
  }

  /** Create one server and append it to the durable order. */
  create(input: McpServerCreateInput): Promise<McpServer> {
    return this.enqueue(async () => {
      const id = McpServerId(randomUUID())
      const record = recordOf(input)
      await this.requireTable().put(id, record)
      await this.setState({ ...this.requireState(), serverIds: [...this.requireState().serverIds, id] })
      const server = serverOf(id, record)
      this.servers.set(id, server)
      return server
    })
  }

  /** Replace one server's record durably, keeping its id and position. */
  update(id: McpServerId, input: McpServerCreateInput): Promise<McpServer> {
    return this.enqueue(async () => {
      if (this.requireTable().get(id) === undefined) throw new Error(`unknown server '${id}'`)
      const record = recordOf(input)
      await this.requireTable().put(id, record)
      const server = serverOf(id, record)
      this.servers.set(id, server)
      return server
    })
  }

  /** Delete one server registration. Unknown ids are an idempotent no-op. */
  delete(id: McpServerId): Promise<boolean> {
    return this.enqueue(async () => {
      const state = this.requireState()
      if (!state.serverIds.includes(id)) return false
      await this.requireTable().delete(id)
      await this.setState({ ...state, serverIds: state.serverIds.filter(serverId => serverId !== id) })
      this.servers.delete(id)
      return true
    })
  }
}

export default McpRegistry
