/**
 * MCP servers settings plugin, browser half. Registers the `mcp-servers`
 * settings section, which reads the shared `mcpServers` service (the MCP
 * controller's client face) and writes through its create/update/delete
 * commands. The section itself owns no roster state: the service snapshot is
 * the list, and every mutation re-reads it behind the injected callbacks.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: pulls the client MCP service merge (ctx.mcpServers).
import type {} from '@deepseek-ai/dsh-api-mcp-controller/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the SlotRegistry service merge (ctx.slots).
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only: pulls the settings shell's SlotMap merge (the 'settings.section' entry).
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { McpServersSection } from './McpServersSection.tsx'
import type { McpServersSectionInjected } from './McpServersSection.tsx'
import { en, zh, type McpServersKey } from './locales.ts'

export type { McpServersSectionInjected, McpServersSectionProps } from './McpServersSection.tsx'
export type { McpServersKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** MCP servers settings copy. */
    'settings.mcpServers': McpServersKey
  }
}

/** Dictionary namespace owned by this plugin. */
const NS = 'settings.mcpServers'

/** Required services (cordis fiber inject). */
export const inject = ['slots', 'locale', 'mcpServers']

/**
 * Register the MCP servers section once the settings shell declares
 * `settings.section`, handing the section the shared snapshot source, the
 * three write commands, and its own bound translate.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-mcp-servers: dictionaries')

  const t = ctx.locale.bind(NS)
  const injected = (): McpServersSectionInjected => ({
    hooks: { servers: ctx.mcpServers.list },
    create: input => ctx.mcpServers.create(input),
    update: (id, input) => ctx.mcpServers.update(id, input),
    delete: id => ctx.mcpServers.delete(id),
    t,
  })

  // Ordered right after agent presets: adding a server is the routine act
  // that follows choosing the composition it serves.
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'mcp-servers',
    order: 21,
    label: () => t('nav'),
    inject: injected,
  }, McpServersSection))
}
