/**
 * WorkBro application portal: one card per Workspace, opening its blank
 * session on click. Read-only presentation over the global useWorkspaces
 * standard hook; launching stays in the owner's onOpen callback.
 */
import clsx from 'clsx'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: pull the hero apps slot declaration and the useWorkspaces standard hook.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import css from './HomePortal.module.css'

/** Full props of the WorkBro application portal. */
export type HomePortalProps = PropsRuntime<'conversation.hero.apps'> & PropsLocale<'home'>

/**
 * Render the portal: a card per Workspace, or a placeholder when none exist.
 * @param props - owner onOpen/selectedId, the useWorkspaces selector, and t.
 * @returns the portal section element.
 */
export function HomePortal({ useWorkspaces, onOpen, selectedId, t }: HomePortalProps) {
  const workspaces = useWorkspaces(snapshot => snapshot.items)
  return (
    <section className={css.root} aria-label={t('portal.title')}>
      {workspaces.length === 0
        ? <p className={css.empty}>{t('portal.empty')}</p>
        : (
          <ul className={css.grid}>
            {workspaces.map((workspace) => {
              const active = workspace.workspaceId === selectedId
              return (
                <li key={workspace.workspaceId}>
                  <button
                    type="button"
                    className={clsx(css.card, active && css.active)}
                    aria-label={`${t('portal.open.aria')}: ${workspace.title}`}
                    aria-current={active ? 'true' : undefined}
                    onClick={() => { onOpen(workspace.workspaceId) }}
                  >
                    <span className={css.title}>{workspace.title}</span>
                    <span className={css.path}>{workspace.path}</span>
                    <span className={css.count}>
                      {workspace.sessionIds.length} {t('portal.sessions')}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
    </section>
  )
}
