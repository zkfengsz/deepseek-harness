import { clientBundle } from '../../client/tsdown.client.ts'

export default clientBundle(
  '@deepseek-ai/dsh-api-app-controller',
  ['lib/types/index.js'],
  { hostPhase: true },
)
