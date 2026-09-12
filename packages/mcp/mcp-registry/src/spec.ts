/** The MCP server domain declaration: record schema and the `defineDomain` spec. */
import { z } from 'zod'
import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain'
import type { McpServerId } from './types.ts'

/** Server id schema at the durable boundary; branding has no runtime representation. */
const serverId = z.string().transform(value => value as McpServerId)

const reconnect = z.object({
  enabled: z.boolean(),
  initialDelayMs: z.number(),
  maxDelayMs: z.number(),
  maxAttempts: z.number(),
})

const base = {
  serverName: z.string(),
  enabled: z.boolean(),
  toolCallTimeoutMs: z.number(),
  failOnStartupError: z.boolean(),
  reconnect: reconnect.optional(),
}

/** Durable shapes of the two transport records. */
export const stdioServerRecord = z.object({
  ...base,
  transport: z.literal('stdio'),
  command: z.string(),
  args: z.array(z.string()),
  env: z.record(z.string(), z.string()),
  cwd: z.string(),
})

export const streamableHttpServerRecord = z.object({
  ...base,
  transport: z.literal('streamable-http'),
  url: z.string(),
  headers: z.record(z.string(), z.string()),
})

/** Durable shape of one MCP server record. */
export const mcpServerRecord = z.discriminatedUnion('transport', [
  stdioServerRecord,
  streamableHttpServerRecord,
])

/** One stored MCP server record, inferred from {@link mcpServerRecord}. */
export type McpServerRecord = z.infer<typeof mcpServerRecord>

/** Durable registry state: the initialized marker plus the authoritative order. */
export const mcpDomainState = z.object({
  initialized: z.boolean(),
  serverIds: z.array(serverId),
})

/** Durable registry state inferred from {@link mcpDomainState}. */
export type McpDomainState = z.infer<typeof mcpDomainState>

/** The MCP domain spec: one `servers` table keyed by id plus the order singleton. */
export const mcpDomainSpec = defineDomain({
  name: 'mcp',
  version: 1,
  global: {
    schema: mcpDomainState,
    initial: { initialized: false, serverIds: [] },
  },
  tables: { servers: domainTable<McpServerId, McpServerRecord>(mcpServerRecord) },
})
