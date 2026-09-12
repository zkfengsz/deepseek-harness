/**
 * WorkBro embedded business skill catalog.
 *
 * Registers eight domain playbooks on `ctx.skills` so WorkBro agents can load
 * them from the session catalog. Each skill teaches when to use it, which MCP
 * tool family to call, the procedure, and the evidence requirement; it never
 * hard-codes a specific MCP server name.
 *
 * @module @deepseek-ai/dsh-skill-workbro
 */

import type { Context } from '@deepseek-ai/cordis'
import type { SkillRegistration } from '@deepseek-ai/dsh-skill'

/** Origin bucket for skills embedded in a published package. */
const SOURCE = 'bundled'

/** The eight WorkBro business skills registered into the runtime catalog. */
const SKILLS: readonly SkillRegistration[] = [
  {
    name: 'entity-resolution',
    description: 'Resolve a company name to one verified identity using match scores, D-U-N-S ids, and a company 360 overview.',
    source: SOURCE,
    content: `企业识别与核验

# Entity identification & verification

## When to use

- When a company name, alias, or partial identifier must be matched to exactly one legal entity before any KYB, risk, credit, or monitoring work.
- When several candidate records share or resemble the name and you must pick the right one.
- When a D-U-N-S number or a company 360 overview is needed to confirm the matched identity.

## Procedure

1. Normalize the input name (strip legal suffixes, whitespace, and punctuation) and capture the jurisdiction or country the requester expects.
2. Call the MCP tool whose name matches \`mcp__*__*entity*\` or \`mcp__*__*resolution*\` to get candidate matches with match scores.
3. Compare candidates on match score, name, jurisdiction, registration number, and D-U-N-S id; prefer exact and highest-score matches.
4. Call the company-360 overview tool family (\`mcp__*__*overview*\` or \`mcp__*__*company*\`) for the selected candidate to confirm registered name, status, and identifiers.
5. Return exactly one resolved identity; if no candidate clears a confidence threshold, stop and escalate rather than guessing.

## Evidence & sources

- Cite the matched entity id (registration number or D-U-N-S number) and the match score for every resolution.
- Every finding must carry a source reference: the Source ID, the data source name, and the timestamp when the MCP tool returns one. Never present a finding without a source as fact.
- Record which tool family produced the score so a reviewer can reproduce the match.

## Escalation

- Hard rules — for example a registered-name mismatch with the requested entity — win over model judgment; never soften them.
- Ambiguous matches (two plausible entities, or a score near the threshold) go to human review via the \`ask_user_question\` tool, never silently resolved.
- When the specific server is not configured, say so instead of guessing.`,
  },
  {
    name: 'kyb-registry',
    description: 'Assemble registration info, official documents, financing, and equity/controller records for a KYB check.',
    source: SOURCE,
    content: `KYB与查册

# KYB & official records

## When to use

- When assembling a company's registration profile from official records for a Know-Your-Business check.
- When collecting official documents (certificate of incorporation, business license, annual returns) and ownership, investment, or financing records.

## Procedure

1. Confirm the resolved entity id (from \`entity-resolution\`) before querying records.
2. Call the registry and official-record tool family (\`mcp__*__*registry*\`, \`mcp__*__*kyb*\`, \`mcp__*__*official*\`) for registration info: legal name, number, type, status, registered address, and directors.
3. Pull official documents and investment or financing records (\`mcp__*__*document*\`, \`mcp__*__*investment*\`, \`mcp__*__*financing*\`).
4. Pull equity and controller records (\`mcp__*__*equity*\`, \`mcp__*__*controller*\`) to establish who controls the entity.
5. List every document retrieved, then mark each as current, missing, expired, or unverifiable.

## Evidence & sources

- List each document with its Source ID, data source name, and timestamp when the MCP tool returns one.
- Every finding must carry a source reference; a finding without a source is never presented as fact.
- Mark missing, expired, or unverifiable documents explicitly — do not fill gaps by inference.

## Escalation

- Hard rules — an expired license or a registration-status problem — win over model judgment; never soften them.
- Ambiguous or missing documents go to human review via the \`ask_user_question\` tool, never silently resolved.
- When the specific server is not configured, say so instead of guessing.`,
  },
  {
    name: 'ubo-ownership',
    description: 'Trace ownership chains to the ultimate beneficial owner across direct and indirect holdings.',
    source: SOURCE,
    content: `股权穿透与UBO

# Beneficial ownership & UBO

## When to use

- When tracing who ultimately owns or controls an entity through direct and indirect shareholdings.
- When a KYB or risk review requires the ultimate beneficial owner (UBO) and each ownership hop.

## Procedure

1. Confirm the resolved entity id before tracing.
2. Call the ownership and equity tool family (\`mcp__*__*ownership*\`, \`mcp__*__*equity*\`, \`mcp__*__*shareholder*\`) for the direct shareholders and their holding percentages.
3. For each shareholder that is itself a legal entity, recurse one hop deeper to resolve indirect holding; build the ownership chain hop by hop.
4. Distinguish direct from indirect holding at every level and compute effective ownership where the tool returns it.
5. Identify the ultimate beneficial owner(s) — natural persons or final controlling entities — and stop only when no further corporate layer remains.

## Evidence & sources

- Every hop in the chain must trace to a source: cite the Source ID, data source name, and timestamp for each ownership record.
- A hop without a source is a gap, not a fact; never present an inferred link as ownership.
- Record percentages exactly as returned; do not round or sum indirect holdings by assumption.

## Escalation

- A control-relationship break (a broken chain, a nominee, or a mismatch) is a hard rule that wins over model judgment; never soften it.
- Ambiguous chains go to human review via the \`ask_user_question\` tool, never silently resolved.
- When the specific server is not configured, say so instead of guessing.`,
  },
  {
    name: 'risk-screening',
    description: 'Screen an entity for judicial, operational, related-party, public-opinion, watchlist, and negative-news risk.',
    source: SOURCE,
    content: `风险筛查

# Risk screening

## When to use

- When screening an entity or person for judicial, operational, related-party, public-opinion, third-party, watchlist, or negative-news risk.
- Before onboarding, a transaction, or a periodic review where a risk decision depends on these signals.

## Procedure

1. Confirm the resolved entity id, then call the screening tool family (\`mcp__*__*screening*\`, \`mcp__*__*risk*\`, \`mcp__*__*watchlist*\`).
2. Collect judicial records (\`mcp__*__*judicial*\`), operational and related-party signals, public-opinion and negative-news (\`mcp__*__*news*\`, \`mcp__*__*opinion*\`), and third-party or watchlist hits.
3. Classify every hit as a hard hit (sanctions, enforcement, bankruptcy) or a soft signal (unverified mention, sector exposure).
4. Keep hard hits separate from soft signals in the output; never mix or average them into one score.
5. Produce a per-signal risk summary with source, severity, and recency.

## Evidence & sources

- Every hit must carry a Source ID, data source name, and timestamp when the MCP tool returns one.
- A finding without a source is never presented as fact; distinguish confirmed hits from unverified signals.

## Escalation

- Hard rules — a sanctions hit or a watchlist match — win over model judgment; never soften or downrank them.
- Ambiguous or borderline signals go to human review via the \`ask_user_question\` tool, never silently resolved.
- When the specific server is not configured, say so instead of guessing.`,
  },
  {
    name: 'credit-assessment',
    description: 'Turn financial, payment, rating, and failure signals into a sourced credit recommendation.',
    source: SOURCE,
    content: `信用评估

# Credit assessment

## When to use

- When producing a credit brief or recommendation from financial, payment, rating, and failure signals.
- When a suggested credit limit or an industry benchmark is requested.

## Procedure

1. Confirm the resolved entity id, then gather financial signals (\`mcp__*__*financial*\`, \`mcp__*__*finance*\`) and payment records (\`mcp__*__*payment*\`).
2. Gather rating and failure or risk scores (\`mcp__*__*rating*\`, \`mcp__*__*failure*\`, \`mcp__*__*credit*\`) and the industry benchmark.
3. Structure the output as basis → reasoning → recommendation: list the sourced signals (basis), explain how they combine (reasoning), then give a credit recommendation with a suggested limit.
4. Keep model-derived judgment separate from hard rule thresholds; never present a derived score as a sourced fact.

## Evidence & sources

- Every signal must carry a Source ID, data source name, and timestamp when the MCP tool returns one.
- A finding without a source is never presented as fact; quote the benchmark source explicitly.

## Escalation

- Hard rules — a payment default, a failure score over a threshold, or an insolvency flag — win over model judgment; never soften them.
- Ambiguous or contradictory signals go to human review via the \`ask_user_question\` tool, never silently resolved.
- When the specific server is not configured, say so instead of guessing.`,
  },
  {
    name: 'customer-tiering',
    description: 'Segment customers and map them to lists, opportunities, and watchlist/allowlist state.',
    source: SOURCE,
    content: `客户识别与分层

# Customer identification & tiering

## When to use

- When segmenting customers into tiers and mapping them to lists, opportunities, and watchlist or allowlist state.
- When a customer's tier or list membership must be updated from fresh signals.

## Procedure

1. Confirm each customer's resolved entity id before tiering.
2. Gather customer attributes and signals via the customer, tier, and list tool family (\`mcp__*__*customer*\`, \`mcp__*__*tier*\`, \`mcp__*__*list*\`).
3. Map each customer to a segment or tier and to the relevant lists and opportunities; record the mapping with its basis.
4. Update watchlist and allowlist state from hard screening signals, not from inference.
5. Return a tiering table: customer id, segment, tier, list membership, and the source behind each assignment.

## Evidence & sources

- Every tier and list assignment must carry a Source ID, data source name, and timestamp when the MCP tool returns one.
- A finding without a source is never presented as fact; do not move a customer between lists without a sourced reason.

## Escalation

- Hard rules — a sanctions or watchlist hit that forces allowlist removal — win over model judgment; never soften them.
- Ambiguous tier boundaries go to human review via the \`ask_user_question\` tool, never silently resolved.
- When the specific server is not configured, say so instead of guessing.`,
  },
  {
    name: 'overseas-acquisition',
    description: 'Find target markets, buyers, distributors, channels, contacts, and buying signals for overseas acquisition.',
    source: SOURCE,
    content: `海外拓客

# Overseas customer acquisition

## When to use

- When identifying target markets, buyers, distributors, channels, and contacts for overseas customer acquisition.
- When surfacing buying signals that qualify a lead.

## Procedure

1. Define the target market and ideal customer profile, then call the market and buyer tool family (\`mcp__*__*market*\`, \`mcp__*__*buyer*\`, \`mcp__*__*lead*\`).
2. Gather distributor and channel options (\`mcp__*__*distributor*\`, \`mcp__*__*channel*\`) and contact points (\`mcp__*__*contact*\`).
3. Identify buying signals (\`mcp__*__*signal*\`, \`mcp__*__*intent*\`) and separate verified signals from inferred opportunity.
4. Enrich each lead and attach the source for every fact; never mark a lead qualified without evidence.
5. Return a prospect list with market, buyer, channel, contact, and the buying signal behind each entry.

## Evidence & sources

- Every lead, contact, and signal must carry a Source ID, data source name, and timestamp when the MCP tool returns one.
- A finding without a source is never presented as fact; distinguish verified facts from inferred opportunities.

## Escalation

- Hard rules — for example a compliance or sanctions barrier to a market — win over model judgment; never soften them.
- Ambiguous or unverifiable leads go to human review via the \`ask_user_question\` tool, never silently resolved.
- When the specific server is not configured, say so instead of guessing.`,
  },
  {
    name: 'continuous-monitoring',
    description: 'Monitor entity status, shareholder changes, sanctions, and risk/credit changes and emit change alerts.',
    source: SOURCE,
    content: `持续监控与复审

# Continuous monitoring & review

## When to use

- When monitoring an entity's status, shareholder changes, sanction-list membership, or risk and credit changes over time.
- When producing a change alert that compares a baseline snapshot against the current state.

## Procedure

1. Load or establish the baseline snapshot (entity status, shareholders, sanctions, risk, and credit at a prior point).
2. Call the monitoring tool family (\`mcp__*__*monitor*\`, \`mcp__*__*change*\`, \`mcp__*__*status*\`) for the current state of the same fields.
3. Compare baseline vs now for each field and detect changes: status, shareholder, sanction-list, risk, and credit.
4. For each change, produce an alert with the field, before value, after value, and the source of the new value.
5. Suppress only noise (no change, or a change with no sourced difference); never suppress a hard-rule change.

## Evidence & sources

- Every change alert must carry a Source ID, data source name, and timestamp for both the baseline and the current value.
- A finding without a source is never presented as fact; never report a change you cannot source.

## Escalation

- Hard rules — a new sanction listing, a control-relationship break, or an expired license — win over model judgment; never soften them.
- Ambiguous changes (a partial update or a conflicting source) go to human review via the \`ask_user_question\` tool, never silently resolved.
- When the specific server is not configured, say so instead of guessing.`,
  },
]

/** Cordis plugin name. */
export const name = 'workbro-skills'

/** Service the runtime skill catalog registers against. */
export const inject = ['skills']

/** Register the eight WorkBro skills on `ctx.skills`, each tied to this fiber. */
export function apply(ctx: Context): void {
  for (const skill of SKILLS) {
    ctx.effect(() => ctx.skills.register(skill))
  }
}
