/**
 * `home` namespace dictionaries: the application portal (card grid title,
 * empty placeholder, open affordance, session count suffix).
 */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'portal.title': '应用',
  'portal.empty': '暂无应用',
  'portal.open.aria': '打开应用',
  'portal.sessions': '个会话',
} satisfies Record<string, string>

/** The home namespace key union. */
export type HomeKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'portal.title': 'Apps',
  'portal.empty': 'No apps yet',
  'portal.open.aria': 'Open app',
  'portal.sessions': 'sessions',
} satisfies Record<HomeKey, string>
