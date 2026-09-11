// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AppSnapshot, AppView } from '@deepseek-ai/dsh-api-app-controller/client'
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
import { HomePortal, type HomePortalProps } from '../src/client/HomePortal.tsx'
import { zh } from '../src/client/locales.ts'

afterEach(cleanup)

const t = ((key: string) => (zh as Record<string, string>)[key] ?? key) as HomePortalProps['t']

const apps: readonly AppView[] = [
  { appId: 'app-1' as never, name: '合规巡检台', icon: '🛡️', description: '批量制裁筛查', preset: 'compliance' },
  { appId: 'app-2' as never, name: '拓客', description: '找客户' },
]

function snapshot(items: readonly AppView[]): AppSnapshot {
  return { apps: items }
}

function bench(items: readonly AppView[] = apps) {
  const onOpenApp = vi.fn()
  const useApps: SnapshotSelectorHook<AppSnapshot> = sel => sel(snapshot(items))
  const props = { useApps, onOpenApp, selectedAppId: undefined, t } as HomePortalProps
  return { props, onOpenApp }
}

describe('HomePortal', () => {
  it('renders one card per app', () => {
    render(<HomePortal {...bench().props} />)
    expect(screen.getByText('合规巡检台')).toBeTruthy()
    expect(screen.getByText('拓客')).toBeTruthy()
  })

  it('opens an app when its card is clicked', () => {
    const { props, onOpenApp } = bench()
    render(<HomePortal {...props} />)
    fireEvent.click(screen.getByRole('button', { name: '打开应用: 合规巡检台' }))
    expect(onOpenApp).toHaveBeenCalledWith(apps[0])
  })

  it('marks the selected app as current', () => {
    const { props } = bench()
    render(<HomePortal {...({ ...props, selectedAppId: 'app-1' as never })} />)
    expect(screen.getByRole('button', { name: '打开应用: 合规巡检台' }).getAttribute('aria-current')).toBe('true')
  })

  it('renders the app icon and preset', () => {
    render(<HomePortal {...bench().props} />)
    expect(screen.getByText('🛡️')).toBeTruthy()
    expect(screen.getByText('compliance')).toBeTruthy()
  })

  it('renders the empty placeholder when no app exists', () => {
    render(<HomePortal {...bench([]).props} />)
    expect(screen.getByText('暂无应用')).toBeTruthy()
  })
})
