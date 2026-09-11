/**
 * `workbroBrand` namespace dictionaries: the WorkBro brand name. The brand is a
 * proper noun, so both dictionaries carry the same value.
 */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'brand.name': 'WorkBro',
} satisfies Record<string, string>

/** The workbroBrand namespace key union. */
export type WorkBroBrandKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'brand.name': 'WorkBro',
} satisfies Record<WorkBroBrandKey, string>
