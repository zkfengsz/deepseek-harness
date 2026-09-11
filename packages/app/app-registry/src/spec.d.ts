/** The app domain declaration: record schema and the `defineDomain` spec. */
import { z } from 'zod'
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace/types'
import type { AppId } from './types.ts'
/** Durable shape of one app record. */
export declare const appRecord: z.ZodObject<{
  name: z.ZodString
  icon: z.ZodOptional<z.ZodString>
  description: z.ZodOptional<z.ZodString>
  preset: z.ZodOptional<z.ZodString>
  workspaceId: z.ZodOptional<z.ZodPipe<z.ZodString, z.ZodTransform<WorkspaceId, string>>>
}, z.core.$strip>
/** One stored app record, inferred from {@link appRecord}. */
export type AppRecord = z.infer<typeof appRecord>
/** Durable registry state: the initialized marker plus the authoritative display order. */
export declare const appDomainState: z.ZodObject<{
  initialized: z.ZodBoolean
  appIds: z.ZodArray<z.ZodPipe<z.ZodString, z.ZodTransform<AppId, string>>>
}, z.core.$strip>
/** Durable registry state inferred from {@link appDomainState}. */
export type AppDomainState = z.infer<typeof appDomainState>
/** The app domain spec: one `apps` table keyed by {@link AppId} plus the order singleton. */
export declare const appDomainSpec: {
  name: string
  version: number
  global: {
    schema: z.ZodObject<{
      initialized: z.ZodBoolean
      appIds: z.ZodArray<z.ZodPipe<z.ZodString, z.ZodTransform<AppId, string>>>
    }, z.core.$strip>
    initial: {
      initialized: boolean
      appIds: never[]
    }
  }
  tables: {
    apps: import('@deepseek-ai/dsh-storage-domain').DomainTableSpec<AppId, {
      name: string
      icon?: string | undefined
      description?: string | undefined
      preset?: string | undefined
      workspaceId?: WorkspaceId | undefined
    }>
  }
}
//# sourceMappingURL=spec.d.ts.map
