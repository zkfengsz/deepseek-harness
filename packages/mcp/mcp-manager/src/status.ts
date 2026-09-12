/** Coarse connection state of one registry record, for the settings surface. */
import type { McpServerId } from '@deepseek-ai/dsh-mcp-registry'

/** Connection state of one server. A post-connect reconnect drop is not tracked. */
export type McpServerStatus = {
  readonly id: McpServerId
  readonly status: 'starting' | 'connected' | 'failed' | 'disabled'
  readonly error?: string | undefined
}
