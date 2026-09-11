/** The app domain declaration: record schema and the `defineDomain` spec. */
import { z } from 'zod'
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace/types'
import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain'
import type { AppId } from './types.ts'

/** App id schema at the durable boundary; branding has no runtime representation. */
const appId = z.string().transform(value => value as AppId)

const workspaceId = z.string().transform(value => value as WorkspaceId)

/** Durable shape of one app record. */
export const appRecord = z.object({
  name: z.string(),
  icon: z.string().optional(),
  description: z.string().optional(),
  preset: z.string().optional(),
  workspaceId: workspaceId.optional(),
})

/** One stored app record, inferred from {@link appRecord}. */
export type AppRecord = z.infer<typeof appRecord>

/** Durable registry state: the initialized marker plus the authoritative display order. */
export const appDomainState = z.object({
  initialized: z.boolean(),
  appIds: z.array(appId),
})

/** Durable registry state inferred from {@link appDomainState}. */
export type AppDomainState = z.infer<typeof appDomainState>

/** The app domain spec: one `apps` table keyed by {@link AppId} plus the order singleton. */
export const appDomainSpec = defineDomain({
  name: 'app',
  version: 1,
  global: {
    schema: appDomainState,
    initial: { initialized: false, appIds: [] },
  },
  tables: { apps: domainTable<AppId, AppRecord>(appRecord) },
})
