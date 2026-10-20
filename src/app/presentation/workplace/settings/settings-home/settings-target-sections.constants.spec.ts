// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Klacksy scrolls to settings cards (explain skills) and to ERP and employee import elements by DOM id; the settings page only
 * renders them once their section is open and expert mode is on, which the target-to-section mapping triggers.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { SETTINGS_TARGET_SECTIONS } from './settings-target-sections.constants';
import { SETTINGS_EXPERT_MODE_SECTIONS } from './settings-expert-mode.constants';
import { PAGE_EXPLAIN_ROUTES, PAGE_EXPLAIN_TARGETS } from 'src/app/domain/constants/page-explain-icons.constants';
import { ERP_DROP_POINTS_TAB_TARGETS } from '../erp-drop-points/erp-drop-points-target.constants';
import {
  CLIENT_IMPORT_CARD_TAB_TARGETS,
  CLIENT_IMPORT_MODAL_TARGETS,
} from '../client-import/client-import-target.constants';

const ERP_UPLOAD_ZONE_TARGET = 'erp-drop-points-upload-zone';
const CLIENT_IMPORT_TARGET = 'client-import';
const IMPORT_SECTION = 'import';
const SETTINGS_ROUTE = '/workplace/settings';
const SPEC_DIR = dirname(fileURLToPath(import.meta.url));
const SETTINGS_HOME_TEMPLATE = readFileSync(resolve(SPEC_DIR, 'settings-home.component.html'), 'utf8');

function settingsExplainTargets(): [string, string][] {
  return Object.entries(PAGE_EXPLAIN_TARGETS).filter(([skill]) => PAGE_EXPLAIN_ROUTES[skill] === SETTINGS_ROUTE);
}

describe('SETTINGS_TARGET_SECTIONS', () => {
  it('opens the import section in expert mode for the upload zone target', () => {
    expect(SETTINGS_TARGET_SECTIONS[ERP_UPLOAD_ZONE_TARGET]).toBe(IMPORT_SECTION);
    expect(SETTINGS_EXPERT_MODE_SECTIONS.has(IMPORT_SECTION)).toBe(true);
  });

  it('opens the import section in expert mode for the employee import card', () => {
    expect(SETTINGS_TARGET_SECTIONS[CLIENT_IMPORT_TARGET]).toBe(IMPORT_SECTION);
    expect(SETTINGS_EXPERT_MODE_SECTIONS.has(IMPORT_SECTION)).toBe(true);
  });

  // The scanner hook parses this constant as source text, so the ERP tab targets are listed literally there.
  it('opens the import section for every target inside an ERP card tab', () => {
    for (const target of Object.keys(ERP_DROP_POINTS_TAB_TARGETS)) {
      expect(SETTINGS_TARGET_SECTIONS[target], target).toBe(IMPORT_SECTION);
    }
  });

  it('opens the import section for every target of the employee import card and its modal', () => {
    for (const target of [...Object.keys(CLIENT_IMPORT_CARD_TAB_TARGETS), ...CLIENT_IMPORT_MODAL_TARGETS]) {
      expect(SETTINGS_TARGET_SECTIONS[target], target).toBe(IMPORT_SECTION);
    }
  });

  it('opens the section of every settings card an explain skill scrolls to', () => {
    for (const [skill, target] of settingsExplainTargets()) {
      expect(SETTINGS_TARGET_SECTIONS[target], `${skill} -> ${target}`).toBeDefined();
    }
  });

  it('only names settings cards that carry the data-klacksy-target attribute', () => {
    for (const [skill, target] of settingsExplainTargets()) {
      expect(SETTINGS_HOME_TEMPLATE.includes(`data-klacksy-target="${target}"`), `${skill} -> ${target}`).toBe(true);
    }
  });
});
