/**
 * `settings.mcpServers` namespace dictionaries: the MCP server list, the inline
 * add/edit form, and the per-server status badge.
 */

/** Locale keys the MCP servers settings section renders. */
export type McpServersKey =
  | 'nav'
  | 'add'
  | 'edit'
  | 'delete'
  | 'cancel'
  | 'save'
  | 'serverName'
  | 'transport'
  | 'command'
  | 'args'
  | 'env'
  | 'cwd'
  | 'url'
  | 'headers'
  | 'status.starting'
  | 'status.connected'
  | 'status.failed'
  | 'status.disabled'

/** English copy. */
export const en: Record<McpServersKey, string> = {
  nav: 'MCP servers',
  add: 'Add MCP server',
  edit: 'Edit',
  delete: 'Delete',
  cancel: 'Cancel',
  save: 'Save',
  serverName: 'Server name',
  transport: 'Transport',
  command: 'Command',
  args: 'Arguments (one per line)',
  env: 'Environment (KEY=VALUE per line)',
  cwd: 'Working directory',
  url: 'URL',
  headers: 'Headers (KEY=VALUE per line)',
  'status.starting': 'Starting',
  'status.connected': 'Connected',
  'status.failed': 'Failed',
  'status.disabled': 'Disabled',
}

/** Simplified Chinese copy. */
export const zh: Record<McpServersKey, string> = {
  nav: 'MCP 服务器',
  add: '添加 MCP 服务器',
  edit: '编辑',
  delete: '删除',
  cancel: '取消',
  save: '保存',
  serverName: '服务器名称',
  transport: '传输方式',
  command: '命令',
  args: '参数（每行一个）',
  env: '环境变量（每行 KEY=VALUE）',
  cwd: '工作目录',
  url: 'URL',
  headers: '请求头（每行 KEY=VALUE）',
  'status.starting': '启动中',
  'status.connected': '已连接',
  'status.failed': '失败',
  'status.disabled': '已禁用',
}
