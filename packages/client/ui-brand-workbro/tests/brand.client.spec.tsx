// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { WorkBroMark, WorkBroName } from '../src/client/Brand.tsx'
import { zh } from '../src/client/locales.ts'

afterEach(cleanup)

const t = ((key: string) => (zh as Record<string, string>)[key] ?? key) as PropsLocale<'workbroBrand'>['t']

describe('WorkBro brand', () => {
  it('renders the mark monogram at the host-requested size', () => {
    render(<WorkBroMark size={24} />)
    expect(screen.getByText('W')).toBeTruthy()
  })

  it('renders the WorkBro name', () => {
    render(<WorkBroName t={t} />)
    expect(screen.getByText('WorkBro')).toBeTruthy()
  })
})
