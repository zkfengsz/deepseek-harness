/**
 * `home` namespace dictionaries: the application portal (card grid, empty
 * placeholder, open affordance, and the create form).
 */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'portal.title': '应用',
  'portal.empty': '暂无应用',
  'portal.open.aria': '打开应用',
  'portal.create': '新建应用',
  'portal.name.placeholder': '应用名称',
  'portal.preset.placeholder': '预设（可选）',
  'portal.create.action': '创建',
  'portal.cancel': '取消',
} satisfies Record<string, string>

/** The home namespace key union. */
export type HomeKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'portal.title': 'Apps',
  'portal.empty': 'No apps yet',
  'portal.open.aria': 'Open app',
  'portal.create': 'New app',
  'portal.name.placeholder': 'App name',
  'portal.preset.placeholder': 'Preset (optional)',
  'portal.create.action': 'Create',
  'portal.cancel': 'Cancel',
} satisfies Record<HomeKey, string>
