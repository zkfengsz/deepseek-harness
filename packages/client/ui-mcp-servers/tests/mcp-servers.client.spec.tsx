// @vitest-environment jsdom
/**
 * The MCP servers settings section: rows render name, transport, status, and
 * the failure reason; the inline form builds a stdio or streamable-http
 * request from line input and routes it to create or update; delete reaches
 * the injected callback; and a refused submission shows its reason.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import { bindSnapshotSelector } from '@deepseek-ai/dsh-client-test-runtime'
import type {
  McpServerId, McpServerSnapshot, McpServerView,
} from '@deepseek-ai/dsh-api-mcp-controller/client'
import { McpServersSection } from '../src/client/McpServersSection.tsx'
import type { McpServersSectionProps } from '../src/client/McpServersSection.tsx'
import { en, type McpServersKey } from '../src/client/locales.ts'

afterEach(cleanup)

/** Build one MCP server view; `id` doubles as the default server name. */
const server = (id: string, patch: Partial<Omit<McpServerView, 'id'>> = {}): McpServerView =>
  ({
    id: id as McpServerId,
    serverName: id,
    enabled: true,
    transport: 'stdio',
    toolCallTimeoutMs: 60000,
    failOnStartupError: false,
    status: 'disabled',
    ...patch,
  })

/** Render the section over a fixed snapshot, returning the write spies. */
function renderSection(options: { servers?: readonly McpServerView[] } = {}) {
  const store = createSnapshotStore<McpServerSnapshot>({ servers: options.servers ?? [] })
  const create = vi.fn(() => Promise.resolve(server('created')))
  const update = vi.fn(() => Promise.resolve(server('updated')))
  const remove = vi.fn(() => Promise.resolve())
  const props = {
    close: () => {},
    useServers: bindSnapshotSelector(store),
    create,
    update,
    delete: remove,
    t: (key: McpServersKey) => en[key],
  } as unknown as McpServersSectionProps
  render(<McpServersSection {...props} />)
  return { create, update, remove }
}

/** Locate a row by the server name it prints. */
function rowFor(name: string): HTMLElement {
  const row = screen.getByText(name).closest('li')
  if (row === null) throw new Error(`no row for ${name}`)
  return row
}

/** Submit the open form through its Save button's form. */
function submitForm(): void {
  const form = screen.getByRole('button', { name: en.save }).closest('form')
  if (form === null) throw new Error('no open form')
  fireEvent.submit(form)
}

describe('the server list', () => {
  it('renders a row per server with name, transport, status, and failure reason', () => {
    renderSection({
      servers: [
        server('alpha', { transport: 'stdio', status: 'connected' }),
        server('beta', { transport: 'streamable-http', url: 'http://x', status: 'failed', error: 'refused' }),
        server('gamma', { status: 'failed' }),
        server('delta', { status: 'starting' }),
        server('epsilon', { status: 'disabled' }),
      ],
    })

    expect(within(rowFor('alpha')).getByText('stdio')).toBeTruthy()
    expect(within(rowFor('alpha')).getByText(en['status.connected'])).toBeTruthy()
    expect(within(rowFor('beta')).getByText('streamable-http')).toBeTruthy()
    expect(within(rowFor('beta')).getByText(en['status.failed'])).toBeTruthy()
    expect(within(rowFor('beta')).getByRole('alert').textContent).toBe('refused')
    // A failed row with no error shows the badge but no reason text.
    expect(within(rowFor('gamma')).getByText(en['status.failed'])).toBeTruthy()
    expect(within(rowFor('gamma')).queryByRole('alert')).toBeNull()
    expect(within(rowFor('delta')).getByText(en['status.starting'])).toBeTruthy()
    expect(within(rowFor('epsilon')).getByText(en['status.disabled'])).toBeTruthy()
  })
})

describe('adding a server', () => {
  it('builds a stdio request from the command/args/env/cwd fields', async () => {
    const { create } = renderSection()

    fireEvent.click(screen.getByRole('button', { name: en.add }))
    fireEvent.change(screen.getByLabelText(en.serverName), { target: { value: 'npx-server' } })
    fireEvent.change(screen.getByLabelText(en.command), { target: { value: 'npx' } })
    fireEvent.change(screen.getByLabelText(en.args), { target: { value: '-y\n\n  @modelcontextprotocol/server-time  ' } })
    fireEvent.change(screen.getByLabelText(en.env), { target: { value: 'KEY=VALUE\n\nNOT_A_PAIR\n=VALUE\nOTHER=2' } })
    fireEvent.change(screen.getByLabelText(en.cwd), { target: { value: ' /work ' } })
    submitForm()

    await waitFor(() => { expect(create).toHaveBeenCalledTimes(1) })
    expect(create).toHaveBeenCalledWith({
      serverName: 'npx-server',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-time'],
      env: { KEY: 'VALUE', OTHER: '2' },
      cwd: '/work',
    })
    await waitFor(() => { expect(screen.queryByRole('button', { name: en.save })).toBeNull() })
  })

  it('builds a streamable-http request from the url/headers fields', async () => {
    const { create } = renderSection()

    fireEvent.click(screen.getByRole('button', { name: en.add }))
    fireEvent.change(screen.getByLabelText(en.transport), { target: { value: 'streamable-http' } })
    fireEvent.change(screen.getByLabelText(en.serverName), { target: { value: 'http-server' } })
    fireEvent.change(screen.getByLabelText(en.url), { target: { value: ' http://x/mcp ' } })
    fireEvent.change(screen.getByLabelText(en.headers), { target: { value: 'Authorization=Bearer t\n\nX-Key=1' } })
    submitForm()

    await waitFor(() => { expect(create).toHaveBeenCalledTimes(1) })
    expect(create).toHaveBeenCalledWith({
      serverName: 'http-server',
      transport: 'streamable-http',
      url: 'http://x/mcp',
      headers: { Authorization: 'Bearer t', 'X-Key': '1' },
    })
  })
})

describe('editing a server', () => {
  it('pre-fills a full stdio server and submits an update', async () => {
    const { update } = renderSection({
      servers: [
        server('npx-server', {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-time'],
          env: { KEY: 'VALUE' },
          cwd: '/work',
          status: 'connected',
        }),
      ],
    })

    fireEvent.click(within(rowFor('npx-server')).getByRole('button', { name: en.edit }))

    expect(screen.getByLabelText(en.serverName)).toHaveProperty('value', 'npx-server')
    expect(screen.getByLabelText(en.command)).toHaveProperty('value', 'npx')
    expect(screen.getByLabelText(en.args)).toHaveProperty('value', '-y\n@modelcontextprotocol/server-time')
    expect(screen.getByLabelText(en.env)).toHaveProperty('value', 'KEY=VALUE')
    expect(screen.getByLabelText(en.cwd)).toHaveProperty('value', '/work')

    submitForm()

    await waitFor(() => { expect(update).toHaveBeenCalledTimes(1) })
    expect(update).toHaveBeenCalledWith('npx-server', {
      serverName: 'npx-server',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-time'],
      env: { KEY: 'VALUE' },
      cwd: '/work',
    })
  })

  it('pre-fills a streamable-http server and submits an update', async () => {
    const { update } = renderSection({
      servers: [
        server('http-server', {
          transport: 'streamable-http',
          url: 'http://x/mcp',
          headers: { Authorization: 'Bearer t' },
          status: 'connected',
        }),
      ],
    })

    fireEvent.click(within(rowFor('http-server')).getByRole('button', { name: en.edit }))

    expect(screen.getByLabelText(en.url)).toHaveProperty('value', 'http://x/mcp')
    expect(screen.getByLabelText(en.headers)).toHaveProperty('value', 'Authorization=Bearer t')

    submitForm()

    await waitFor(() => { expect(update).toHaveBeenCalledTimes(1) })
    expect(update).toHaveBeenCalledWith('http-server', {
      serverName: 'http-server',
      transport: 'streamable-http',
      url: 'http://x/mcp',
      headers: { Authorization: 'Bearer t' },
    })
  })

  it('leaves optional fields empty for a sparse server and omits an empty cwd', async () => {
    const { update } = renderSection({
      servers: [server('bare', { status: 'connected' })],
    })

    fireEvent.click(within(rowFor('bare')).getByRole('button', { name: en.edit }))

    expect(screen.getByLabelText(en.command)).toHaveProperty('value', '')
    expect(screen.getByLabelText(en.args)).toHaveProperty('value', '')
    expect(screen.getByLabelText(en.env)).toHaveProperty('value', '')
    expect(screen.getByLabelText(en.cwd)).toHaveProperty('value', '')

    submitForm()

    await waitFor(() => { expect(update).toHaveBeenCalledTimes(1) })
    expect(update).toHaveBeenCalledWith('bare', {
      serverName: 'bare',
      transport: 'stdio',
      command: '',
      args: [],
      env: {},
    })
  })
})

describe('deleting a server', () => {
  it('routes the delete action to the injected callback', () => {
    const { remove } = renderSection({ servers: [server('gamma')] })

    fireEvent.click(within(rowFor('gamma')).getByRole('button', { name: en.delete }))

    expect(remove).toHaveBeenCalledWith('gamma')
  })
})

describe('submission errors', () => {
  it('shows the reason a create rejection carries', async () => {
    const { create } = renderSection()
    create.mockRejectedValue(new Error('boom'))

    fireEvent.click(screen.getByRole('button', { name: en.add }))
    fireEvent.change(screen.getByLabelText(en.serverName), { target: { value: 'npx-server' } })
    submitForm()

    await waitFor(() => { expect(screen.getByRole('alert').textContent).toBe('boom') })
  })

  it('shows the string a non-Error rejection carries', async () => {
    const { create } = renderSection()
    create.mockRejectedValue('refused by host')

    fireEvent.click(screen.getByRole('button', { name: en.add }))
    fireEvent.change(screen.getByLabelText(en.serverName), { target: { value: 'npx-server' } })
    submitForm()

    await waitFor(() => { expect(screen.getByRole('alert').textContent).toBe('refused by host') })
  })
})

describe('closing the form', () => {
  it('returns to the add affordance without saving', () => {
    renderSection()

    fireEvent.click(screen.getByRole('button', { name: en.add }))
    fireEvent.click(screen.getByRole('button', { name: en.cancel }))

    expect(screen.queryByRole('button', { name: en.save })).toBeNull()
    expect(screen.getByRole('button', { name: en.add })).toBeTruthy()
  })
})
