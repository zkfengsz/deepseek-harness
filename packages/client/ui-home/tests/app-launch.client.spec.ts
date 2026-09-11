// @vitest-environment jsdom
/**
 * WorkBro app launch in the assembled client: the portal reaches the preset
 * seat through a real Cordis service of the real web rows, and the app's
 * preset reaches the Session the launch starts rather than the running one
 * that is still current while it is created.
 *
 * The two plugins own opposite halves of this flow — the portal decides, the
 * preset surface composes — so only the assembled client proves the channel
 * between them exists.
 */
import { describe, expect, vi } from 'vitest'
import { ok, type RemoteMock, type StreamScript } from '@deepseek-ai/dsh-remote-mock'
import { SESSION_FORMAT_VERSION, type SessionId } from '@deepseek-ai/dsh-session/types'
import { createClientTest, webApp, type TestClient } from '@deepseek-ai/dsh-client-test-runtime/src/assembly/index.ts'

const ROSTER = webApp.closure([
  '@deepseek-ai/dsh-client-ui-home',
  '@deepseek-ai/dsh-client-ui-agent-preset',
])
const test = createClientTest({ roster: ROSTER })
const EVENTS = '$events'
const FOLLOW = 'session/follow'
/** The first client boot pays the cold module transform of the cone. */
const COLD_BOOT_TIMEOUT_MS = 60_000

const sid = (value: string): SessionId => value as SessionId

/**
 * An empty opening snapshot for `session/follow`: opening a Session is what
 * starts the stream, and this spec reads Session membership rather than
 * history.
 * @returns the stream script.
 */
function emptyFollow(): StreamScript {
  return ([request], stream) => {
    const { address } = request as { address: { sessionId: SessionId } }
    stream.push({
      type: 'snapshot',
      header: {
        version: SESSION_FORMAT_VERSION, id: address.sessionId, createdAt: 0, isSeeded: false,
      },
      cursor: -1,
      records: [],
      hasMore: false,
      projections: { asOfSeq: -1, values: {} },
    })
  }
}

/** Add one Session to the list the way the Host announces it. */
async function added(mock: RemoteMock, id: string, blank: boolean): Promise<void> {
  mock.streams.push(EVENTS, {
    type: 'emit',
    event: 'api-session/added',
    args: [{ sessionId: sid(id), updatedAt: 1, running: !blank, blank }],
  })
  await mock.streams.drained(EVENTS)
}

describe('WorkBro app launch', () => {
  test('applies a launched app preset to the Session the launch starts', async ({ mock, start }) => {
    mock.remote.agentPresets.select.mockResolvedValue(ok('minimal'))
    mock.remote.subagents.list.mockResolvedValue(ok({ entries: [], parentAvailable: true }))
    mock.stream(FOLLOW, emptyFollow())
    const client: TestClient = await start()
    const sessions = client.ctx.sessions
    await vi.waitFor(() => { expect(sessions.list.getSnapshot().phase).toBe('ready') })

    // The portal's channel is a service, not an event: a client event only
    // trickles down from its emitting context, so a sibling never sees one.
    const bridge = client.ctx.get('workbroPresetLaunch')
    expect(bridge).toBeDefined()

    await added(mock, 'session-running', false)
    await vi.waitFor(() => { expect(sessions.list.getSnapshot().byId[sid('session-running')]).toBeDefined() })
    sessions.open(sid('session-running'))

    // The portal stages the app's preset before it starts the Session it
    // lands on; the running Session is merely still current meanwhile.
    bridge!.launch('minimal')
    await client.flush()
    expect(mock.remote.agentPresets.select).not.toHaveBeenCalled()

    await added(mock, 'session-launched', true)
    await vi.waitFor(() => { expect(sessions.list.getSnapshot().byId[sid('session-launched')]).toBeDefined() })
    sessions.open(sid('session-launched'))

    await vi.waitFor(() => {
      expect(mock.remote.agentPresets.select).toHaveBeenCalledWith(sid('session-launched'), 'minimal')
    })
  }, COLD_BOOT_TIMEOUT_MS)
})
