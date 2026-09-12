import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import * as WorkbroSkills from '@deepseek-ai/dsh-skill-workbro'

/** The eight WorkBro business skills, in the task's declared order. */
const SKILL_NAMES = [
  'entity-resolution',
  'kyb-registry',
  'ubo-ownership',
  'risk-screening',
  'credit-assessment',
  'customer-tiering',
  'overseas-acquisition',
  'continuous-monitoring',
]

describe('dsh-skill-workbro', () => {
  it('registers all eight skills with sourced bodies and disposes them with the fiber', async () => {
    const ctx = new Context()
    await ctx.plugin(SkillRegistry)
    const fiber = await ctx.plugin(WorkbroSkills)

    const summaries = await ctx.skills.list()
    expect(summaries.map(skill => skill.name)).toEqual([...SKILL_NAMES].sort())

    for (const name of SKILL_NAMES) {
      const loaded = await ctx.skills.get(name)
      expect(loaded?.name).toBe(name)
      expect(loaded?.provider).toBe('runtime')
      expect(loaded?.content).toContain('Source')
    }

    await fiber.dispose()
    expect(await ctx.skills.list()).toEqual([])
  })
})
