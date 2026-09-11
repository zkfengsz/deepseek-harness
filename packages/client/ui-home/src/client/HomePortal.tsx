/**
 * WorkBro application portal: one card per WorkBro app, opening it on click,
 * plus an inline create form. Read-only presentation over a registrant-private
 * useApps hook; launching stays in the owner's onOpenApp callback and creation
 * goes through the injected createApp action.
 */
import { useState } from 'react'
import clsx from 'clsx'
import type { PropsHooks, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { AppSource } from '@deepseek-ai/dsh-api-app-controller/client'
// Type-only: pull the hero apps slot declaration.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import css from './HomePortal.module.css'

/** Inject face of the portal: the private app snapshot source and create action. */
export interface HomePortalInjected {
  hooks: { apps: AppSource }
  createApp(input: { name: string; preset?: string }): Promise<unknown>
}

/** Full props of the WorkBro application portal. */
export type HomePortalProps =
  PropsRuntime<'conversation.hero.apps'>
  & Omit<HomePortalInjected, 'hooks'>
  & PropsHooks<HomePortalInjected['hooks']>
  & PropsLocale<'home'>

/**
 * Render the portal: a card per app (or a placeholder), with an inline create
 * form toggled by the new-app action.
 * @param props - owner onOpenApp/selectedAppId, useApps selector, createApp, and t.
 * @returns the portal section element.
 */
export function HomePortal({ useApps, onOpenApp, selectedAppId, createApp, t }: HomePortalProps) {
  const apps = useApps(snapshot => snapshot.apps)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [preset, setPreset] = useState('')
  const [error, setError] = useState<string | undefined>(undefined)

  const submit = () => {
    const trimmed = name.trim()
    if (trimmed === '') return
    const presetValue = preset.trim()
    setError(undefined)
    void createApp(presetValue === '' ? { name: trimmed } : { name: trimmed, preset: presetValue }).then(
      () => {
        setName('')
        setPreset('')
        setCreating(false)
      },
      (reason: unknown) => { setError(reason instanceof Error ? reason.message : String(reason)) },
    )
  }

  return (
    <section className={css.root} aria-label={t('portal.title')}>
      {creating
        ? (
          <div className={css.form}>
            <input
              className={css.input}
              value={name}
              onChange={(event) => { setName(event.target.value) }}
              placeholder={t('portal.name.placeholder')}
            />
            <input
              className={css.input}
              value={preset}
              onChange={(event) => { setPreset(event.target.value) }}
              placeholder={t('portal.preset.placeholder')}
            />
            <button type="button" className={css.action} onClick={submit}>{t('portal.create.action')}</button>
            <button type="button" className={css.action} onClick={() => { setCreating(false) }}>{t('portal.cancel')}</button>
            {error !== undefined && <p className={css.error}>{error}</p>}
          </div>
        )
        : <button type="button" className={css.action} onClick={() => { setCreating(true) }}>{t('portal.create')}</button>}
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
