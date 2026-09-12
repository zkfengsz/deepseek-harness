/**
 * MCP servers settings section: one row per server plus an inline add/edit
 * form. Rows read the shared `mcpServers` snapshot; every mutation goes
 * through the injected create/update/delete callbacks, and a refused
 * submission shows its reason in the form.
 */
import { useState } from 'react'
import type { ReactNode } from 'react'
import clsx from 'clsx'
import type {
  McpServerConnectionStatus, McpServerCreateRequest, McpServerId, McpServerSource, McpServerView,
} from '@deepseek-ai/dsh-api-mcp-controller/client'
import type { InjectFace, PropsRuntime, TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: pulls the settings shell's SlotMap merge (the 'settings.section' entry).
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { McpServersKey } from './locales.ts'
import css from './McpServersSection.module.css'

/** Transport discriminant the form selects between. */
type McpServerTransport = McpServerView['transport']

/** Inject face of the section: the shared snapshot source and the write actions. */
export interface McpServersSectionInjected {
  hooks: {
    /** The shared MCP server list source, bound by the renderer as useServers. */
    servers: McpServerSource
  }
  /** Persist a new MCP server. */
  create: (input: McpServerCreateRequest) => Promise<McpServerView>
  /** Replace one MCP server's configuration. */
  update: (id: McpServerId, input: McpServerCreateRequest) => Promise<McpServerView>
  /** Delete one MCP server. */
  delete: (id: McpServerId) => Promise<void>
  /** Section copy. */
  t: TranslateNS<'settings.mcpServers'>
}

/** Full component props: the settings shell owner share plus the inject face. */
export type McpServersSectionProps =
  PropsRuntime<'settings.section'>
  & InjectFace<McpServersSectionInjected>

/** The add/edit form draft, held as local state while the form is open. */
interface ServerForm {
  /** The server being edited, or null while adding a new one. */
  editingId: McpServerId | null
  serverName: string
  transport: McpServerTransport
  command: string
  /** One argument per line. */
  args: string
  /** One `KEY=VALUE` pair per line. */
  env: string
  cwd: string
  url: string
  /** One `KEY=VALUE` pair per line. */
  headers: string
}

/** Locale key each connection status maps to, matched on the discriminant. */
const STATUS_KEY: Record<McpServerConnectionStatus, McpServersKey> = {
  starting: 'status.starting',
  connected: 'status.connected',
  failed: 'status.failed',
  disabled: 'status.disabled',
}

/** Transport choices in selector order; the label and value are the wire value. */
const TRANSPORT_OPTIONS: readonly McpServerTransport[] = ['stdio', 'streamable-http']

/** A fresh form for adding a server: stdio, every field empty. */
function blankForm(): ServerForm {
  return {
    editingId: null,
    serverName: '',
    transport: 'stdio',
    command: '',
    args: '',
    env: '',
    cwd: '',
    url: '',
    headers: '',
  }
}

/** Pre-fill the form from one existing server, joining list fields back into lines. */
function formOf(server: McpServerView): ServerForm {
  return {
    editingId: server.id,
    serverName: server.serverName,
    transport: server.transport,
    command: server.command ?? '',
    args: (server.args ?? []).join('\n'),
    env: keyValuesToLines(server.env),
    cwd: server.cwd ?? '',
    url: server.url ?? '',
    headers: keyValuesToLines(server.headers),
  }
}

/** Split one-per-line text into trimmed, non-empty lines. */
function toLines(text: string): readonly string[] {
  return text.split(/\r?\n/).map(line => line.trim()).filter(line => line !== '')
}

/** Parse `KEY=VALUE` lines into a record, skipping empty lines and empty keys. */
function toKeyValues(text: string): Record<string, string> {
  const record: Record<string, string> = {}
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (line === '') continue
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    record[line.slice(0, eq).trim()] = line.slice(eq + 1).trim()
  }
  return record
}

/** Join a record back into `KEY=VALUE` lines, or '' when the field is absent. */
function keyValuesToLines(record: Record<string, string> | undefined): string {
  if (record === undefined) return ''
  return Object.entries(record).map(([key, value]) => `${key}=${value}`).join('\n')
}

/** Build the wire request from the form, splitting the line fields. */
function requestOf(form: ServerForm): McpServerCreateRequest {
  const cwd = form.cwd.trim()
  if (form.transport === 'stdio') {
    return {
      serverName: form.serverName.trim(),
      transport: 'stdio',
      command: form.command.trim(),
      args: toLines(form.args),
      env: toKeyValues(form.env),
      ...(cwd === '' ? {} : { cwd }),
    }
  }
  return {
    serverName: form.serverName.trim(),
    transport: 'streamable-http',
    url: form.url.trim(),
    headers: toKeyValues(form.headers),
  }
}

/** Read the message off a rejected promise, whatever it rejected with. */
function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason)
}

/**
 * Render the MCP servers list and its inline add/edit form.
 * @param props - the settings shell `close` share, the bound useServers hook,
 * the create/update/delete actions, and the section translate.
 * @returns the section element.
 */
export function McpServersSection(props: McpServersSectionProps): ReactNode {
  const { useServers, create, update, delete: remove, t } = props
  const servers = useServers(snapshot => snapshot.servers)
  const [form, setForm] = useState<ServerForm | null>(null)
  const [error, setError] = useState<string | null>(null)

  const beginAdd = (): void => {
    setError(null)
    setForm(blankForm())
  }

  const beginEdit = (server: McpServerView): void => {
    setError(null)
    setForm(formOf(server))
  }

  const submit = (draft: ServerForm): void => {
    setError(null)
    const request = requestOf(draft)
    const promise = draft.editingId === null
      ? create(request)
      : update(draft.editingId, request)
    void promise.then(
      () => { setForm(null) },
      (reason: unknown) => { setError(errorMessage(reason)) },
    )
  }

  return (
    <section className={css.section}>
      <ul className={css.list}>
        {servers.map(server => (
          <li key={server.id} className={css.row}>
            <span className={css.name}>{server.serverName}</span>
            <code className={css.transport}>{server.transport}</code>
            <span className={clsx(css.badge, css[server.status])}>{t(STATUS_KEY[server.status])}</span>
            {server.status === 'failed' && server.error !== undefined
              ? <p className={css.error} role="alert">{server.error}</p>
              : null}
            <button type="button" className={css.action} onClick={() => { beginEdit(server) }}>
              {t('edit')}
            </button>
            <button type="button" className={css.action} onClick={() => { void remove(server.id) }}>
              {t('delete')}
            </button>
          </li>
        ))}
      </ul>
      {form === null
        ? (
          <button type="button" className={css.action} onClick={beginAdd}>
            {t('add')}
          </button>
        )
        : (
          <form
            className={css.form}
            onSubmit={(event) => {
              event.preventDefault()
              submit(form)
            }}
          >
            <label className={css.field}>
              <span className={css.fieldLabel}>{t('serverName')}</span>
              <input
                className={css.input}
                value={form.serverName}
                onChange={(event) => { setForm({ ...form, serverName: event.target.value }) }}
              />
            </label>
            <label className={css.field}>
              <span className={css.fieldLabel}>{t('transport')}</span>
              <select
                className={css.input}
                value={form.transport}
                onChange={(event) => {
                  setForm({ ...form, transport: event.target.value as McpServerTransport })
                }}
              >
                {TRANSPORT_OPTIONS.map(transport => (
                  <option key={transport} value={transport}>{transport}</option>
                ))}
              </select>
            </label>
            {form.transport === 'stdio'
              ? (
                <>
                  <label className={css.field}>
                    <span className={css.fieldLabel}>{t('command')}</span>
                    <input
                      className={css.input}
                      value={form.command}
                      onChange={(event) => { setForm({ ...form, command: event.target.value }) }}
                    />
                  </label>
                  <label className={css.field}>
                    <span className={css.fieldLabel}>{t('args')}</span>
                    <textarea
                      className={css.input}
                      rows={3}
                      value={form.args}
                      onChange={(event) => { setForm({ ...form, args: event.target.value }) }}
                    />
                  </label>
                  <label className={css.field}>
                    <span className={css.fieldLabel}>{t('env')}</span>
                    <textarea
                      className={css.input}
                      rows={3}
                      value={form.env}
                      onChange={(event) => { setForm({ ...form, env: event.target.value }) }}
                    />
                  </label>
                  <label className={css.field}>
                    <span className={css.fieldLabel}>{t('cwd')}</span>
                    <input
                      className={css.input}
                      value={form.cwd}
                      onChange={(event) => { setForm({ ...form, cwd: event.target.value }) }}
                    />
                  </label>
                </>
              )
              : (
                <>
                  <label className={css.field}>
                    <span className={css.fieldLabel}>{t('url')}</span>
                    <input
                      className={css.input}
                      value={form.url}
                      onChange={(event) => { setForm({ ...form, url: event.target.value }) }}
                    />
                  </label>
                  <label className={css.field}>
                    <span className={css.fieldLabel}>{t('headers')}</span>
                    <textarea
                      className={css.input}
                      rows={3}
                      value={form.headers}
                      onChange={(event) => { setForm({ ...form, headers: event.target.value }) }}
                    />
                  </label>
                </>
              )}
            {error === null ? null : <p className={css.error} role="alert">{error}</p>}
            <div className={css.formActions}>
              <button type="button" className={css.action} onClick={() => { setForm(null) }}>
                {t('cancel')}
              </button>
              <button type="submit" className={css.action}>{t('save')}</button>
            </div>
          </form>
        )}
    </section>
  )
}
