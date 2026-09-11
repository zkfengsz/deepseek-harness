/**
 * WorkBro application portal: one card per WorkBro app, opening it on click.
 * Read-only presentation over a registrant-private useApps hook; launching
 * stays in the owner's onOpenApp callback.
 */
import clsx from 'clsx'
import type { PropsHooks, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { AppSource } from '@deepseek-ai/dsh-api-app-controller/client'
// Type-only: pull the hero apps slot declaration.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import css from './HomePortal.module.css'

/** Inject face of the portal: the private app snapshot source. */
export interface HomePortalInjected {
  hooks: { apps: AppSource }
}

/** Full props of the WorkBro application portal. */
export type HomePortalProps =
  PropsRuntime<'conversation.hero.apps'>
  & PropsHooks<HomePortalInjected['hooks']>
  & PropsLocale<'home'>

/**
 * Render the portal: a card per app, or a placeholder when none exist.
 * @param props - owner onOpenApp/selectedAppId, the useApps selector, and t.
 * @returns the portal section element.
 */
export function HomePortal({ useApps, onOpenApp, selectedAppId, t }: HomePortalProps) {
  const apps = useApps(snapshot => snapshot.apps)
  return (
    <section className={css.root} aria-label={t('portal.title')}>
      {apps.length === 0
        ? <p className={css.empty}>{t('portal.empty')}</p>
        : (
          <ul className={css.grid}>
            {apps.map((app) => {
              const active = app.appId === selectedAppId
              return (
                <li key={app.appId}>
                  <button
                    type="button"
                    className={clsx(css.card, active && css.active)}
                    aria-label={`${t('portal.open.aria')}: ${app.name}`}
                    aria-current={active ? 'true' : undefined}
                    onClick={() => { onOpenApp(app) }}
                  >
                    <span className={css.title}>
                      {app.icon !== undefined && <span className={css.icon} aria-hidden="true">{app.icon}</span>}
                      {app.name}
                    </span>
                    {app.description !== undefined
                      ? <span className={css.path}>{app.description}</span>
                      : null}
                    {app.preset !== undefined
                      ? <span className={css.count}>{app.preset}</span>
                      : null}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
    </section>
  )
}
