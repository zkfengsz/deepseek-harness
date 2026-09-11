// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { WorkspaceSnapshot, WorkspaceView } from '@deepseek-ai/dsh-api-workspace-controller/client'
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
import { HomePortal, type HomePortalProps } from '../src/client/HomePortal.tsx'
import { zh } from '../src/client/locales.ts'

afterEach(cleanup)

/** The shipped Chinese dictionary as the component's t seat. */
const t = ((key: string) => (zh as Record<string, string>)[key] ?? key) as HomePortalProps['t']

const workspaces: readonly WorkspaceView[] = [
  {
    workspaceId: 'ws-1' as never,
    path: '/proj/alpha',
    title: 'Alpha',
    sessionIds: ['s1' as never, 's2' as never],
    createdAt: '0',
    updatedAt: '0',
  },
  {
    workspaceId: 'ws-2' as never,
    path: '/proj/beta',
    title: 'Beta',
    sessionIds: [],
    createdAt: '0',
    updatedAt: '0',
  },
]

function snapshot(items: readonly WorkspaceView[]): WorkspaceSnapshot {
  return { items, archivedSessionIds: [], state: 'idle', phase: 'ready', error: null }
}

function bench(items: readonly WorkspaceView[] = workspaces) {
  const onOpen = vi.fn()
  const useWorkspaces: SnapshotSelectorHook<WorkspaceSnapshot> = sel => sel(snapshot(items))
  const props = { useWorkspaces, onOpen, selectedId: undefined, t } as HomePortalProps
  return { props, onOpen }
}

describe('HomePortal', () => {
  it('renders one card per workspace', () => {
    render(<HomePortal {...bench().props} />)
    expect(screen.getByText('Alpha')).toBeTruthy()
    expect(screen.getByText('Beta')).toBeTruthy()
    expect(screen.getByText('/proj/alpha')).toBeTruthy()
    expect(screen.getByText(/2/)).toBeTruthy()
  })

  it('opens a workspace when its card is clicked', () => {
    const { props, onOpen } = bench()
    render(<HomePortal {...props} />)
    fireEvent.click(screen.getByRole('button', { name: '打开应用: Alpha' }))
    expect(onOpen).toHaveBeenCalledWith('ws-1')
  })

  it('marks the selected workspace as current', () => {
    const { props } = bench()
    render(<HomePortal {...({ ...props, selectedId: 'ws-1' as never })} />)
    expect(screen.getByRole('button', { name: '打开应用: Alpha' }).getAttribute('aria-current')).toBe('true')
  })

  it('renders the empty placeholder when no workspace exists', () => {
    render(<HomePortal {...bench([]).props} />)
    expect(screen.getByText('暂无应用')).toBeTruthy()
  })

  it('renders the app icon, name, and description when a manifest exists', () => {
    const withApp = [{ ...workspaces[0]!, app: { name: '合规巡检台', icon: '🛡️', description: '批量制裁筛查' } }]
    render(<HomePortal {...bench(withApp).props} />)
    expect(screen.getByText('🛡️')).toBeTruthy()
    expect(screen.getByText('合规巡检台')).toBeTruthy()
    expect(screen.getByText('批量制裁筛查')).toBeTruthy()
  })
})
