/** Public type vocabulary of the user-added MCP server entity. Types only. */
import type { Branded } from '@deepseek-ai/dsh-brand'

/** Identifies one user-added MCP server record. A generated uuid, never a name. */
export type McpServerId = Branded<'McpServerId'>

/** Automatic reconnect policy after a lost connection, mirroring the MCP client's. */
export interface McpReconnectConfig {
  readonly enabled: boolean
  readonly initialDelayMs: number
  readonly maxDelayMs: number
  readonly maxAttempts: number
}

/** Fields every MCP server record carries regardless of transport. */
interface McpServerBase {
  /** Stable record id (generated uuid). */
  readonly id: McpServerId
  /** Stable local namespace for model-facing tool names (`mcp__<name>__<tool>`). */
  readonly serverName: string
  /** Whether the manager should hold a live connection for this server. */
  readonly enabled: boolean
  /** Per-tool-call timeout in milliseconds. */
  readonly toolCallTimeoutMs: number
  /** Fail activation when the initial connection or tool synchronization fails. */
  readonly failOnStartupError: boolean
  /** Automatic reconnect policy after a lost connection. */
  readonly reconnect?: McpReconnectConfig | undefined
}

/** One stdio MCP server: the record carries resolved defaults, not omitted fields. */
export interface McpStdioServer extends McpServerBase {
  readonly transport: 'stdio'
  readonly command: string
  readonly args: readonly string[]
  readonly env: Record<string, string>
  readonly cwd: string
}

/** One Streamable HTTP MCP server. */
export interface McpStreamableHttpServer extends McpServerBase {
  readonly transport: 'streamable-http'
  readonly url: string
  readonly headers: Record<string, string>
}

/** One user-added MCP server, discriminated on transport. */
export type McpServer = McpStdioServer | McpStreamableHttpServer
