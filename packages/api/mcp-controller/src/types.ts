/** WorkBro MCP server Remote vocabulary. */
import type { McpReconnectConfig, McpServerId } from '@deepseek-ai/dsh-mcp-registry/types'

export type { McpServerId } from '@deepseek-ai/dsh-mcp-registry/types'

/** Coarse connection state of one server, for the settings surface. */
export type McpServerConnectionStatus = 'starting' | 'connected' | 'failed' | 'disabled'

/** One MCP server projected for browser consumers, flattened over both transports. */
export interface McpServerView {
  readonly id: McpServerId
  readonly serverName: string
  readonly enabled: boolean
  readonly transport: 'stdio' | 'streamable-http'
  readonly command?: string | undefined
  readonly args?: readonly string[] | undefined
  readonly env?: Record<string, string> | undefined
  readonly cwd?: string | undefined
  readonly url?: string | undefined
  readonly headers?: Record<string, string> | undefined
  readonly toolCallTimeoutMs: number
  readonly failOnStartupError: boolean
  readonly reconnect?: McpReconnectConfig | undefined
  readonly status: McpServerConnectionStatus
  readonly error?: string | undefined
}

/** Complete MCP server list projection. */
export interface McpServerListValue {
  readonly servers: readonly McpServerView[]
}

/** Create or replace one MCP server. `command` is required for stdio, `url` for HTTP. */
export interface McpServerCreateRequest {
  readonly serverName: string
  readonly enabled?: boolean | undefined
  readonly transport: 'stdio' | 'streamable-http'
  readonly command?: string | undefined
  readonly args?: readonly string[] | undefined
  readonly env?: Record<string, string> | undefined
  readonly cwd?: string | undefined
  readonly url?: string | undefined
  readonly headers?: Record<string, string> | undefined
  readonly toolCallTimeoutMs?: number | undefined
  readonly failOnStartupError?: boolean | undefined
  readonly reconnect?: McpReconnectConfig | undefined
}

/** Update one MCP server, addressed by id. */
export interface McpServerUpdateRequest extends McpServerCreateRequest {
  readonly id: McpServerId
}

/** Delete one MCP server, addressed by id. */
export interface McpServerDeleteRequest {
  readonly id: McpServerId
}

/** Create/update response: the persisted server with its live status. */
export interface McpServerValue {
  readonly server: McpServerView
}

/** Delete response. */
export interface McpServerDeleteValue {
  readonly deleted: boolean
}

declare module '@deepseek-ai/dsh-typert-protocol' {
  interface RemoteErrorDetailsMap {
    /** No MCP server carries that identity. */
    'mcp/not-found': { readonly id: McpServerId }
  }
}
