// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Guards that every explain_page_* skill seeded in the sibling Klacks.Api checkout has a page route
 * in PAGE_EXPLAIN_ROUTES; without one, Klacksy explains a page but never brings the user to it. Every routed skill's
 * seed must also name that page as handlerConfig.pageKey, which the backend uses to tell the model whether the page
 * is open to the user. Skipped when the Api checkout is not present.
 */

import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { EXPLAIN_PAGE_SKILL_PREFIX, PAGE_EXPLAIN_ROUTES, PAGE_EXPLAIN_TARGETS } from './page-explain-icons.constants';
import { KLACKSY_PAGE_KEYS_BY_KEY } from './klacksy-page-keys';

const SPEC_DIR = dirname(fileURLToPath(import.meta.url));
const SKILL_SEEDS_PATH = resolve(SPEC_DIR, '../../../../../Klacks.Api/Application/Skills/Definitions/skill-seeds.json');

interface SeedSkill {
  name: string;
  handlerConfig?: { pageKey?: string };
}

function loadSeedSkills(): SeedSkill[] | null {
  if (!existsSync(SKILL_SEEDS_PATH)) {
    return null;
  }
  const seeds: { skills?: SeedSkill[] } = JSON.parse(readFileSync(SKILL_SEEDS_PATH, 'utf8'));
  return seeds.skills ?? [];
}

function loadExplainPageSkillNames(): string[] | null {
  return loadSeedSkills()?.map((skill) => skill.name).filter((name) => name.startsWith(EXPLAIN_PAGE_SKILL_PREFIX)) ?? null;
}

describe('PAGE_EXPLAIN_ROUTES guard', () => {
  it('maps every seeded explain_page_* skill to a page route (when the Api checkout is present)', () => {
    const skillNames = loadExplainPageSkillNames();
    if (skillNames === null) {
      return;
    }
    expect(skillNames.length).toBeGreaterThan(0);
    for (const skillName of skillNames) {
      expect(PAGE_EXPLAIN_ROUTES[skillName], skillName).toBeDefined();
    }
  });

  // The backend tells the model "the page is open" or "no access" from the seed's pageKey; it must name the very
  // page the client navigates to, or the answer and the screen disagree.
  it('names the routed page as pageKey in the seed of every routed skill (when the Api checkout is present)', () => {
    const skills = loadSeedSkills();
    if (skills === null) {
      return;
    }
    const seeds = new Map(skills.map((skill) => [skill.name, skill]));
    for (const [skillName, route] of Object.entries(PAGE_EXPLAIN_ROUTES)) {
      const pageKey = seeds.get(skillName)?.handlerConfig?.pageKey;
      expect(pageKey, skillName).toBeDefined();
      expect(KLACKSY_PAGE_KEYS_BY_KEY.get(pageKey!)?.route, skillName).toBe(route);
    }
  });

  it('only gives a scroll target to skills that also have a route', () => {
    for (const skillName of Object.keys(PAGE_EXPLAIN_TARGETS)) {
      expect(PAGE_EXPLAIN_ROUTES[skillName], skillName).toBeDefined();
    }
  });
});
