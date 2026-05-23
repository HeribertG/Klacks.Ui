// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Single source of truth for Klacksy navigation page-keys.
 *
 * This constant array is the canonical mapping from LLM-facing page-key
 * (e.g. "schedule", "edit-employee") to the actual Angular workplace route.
 * It is consumed in three places:
 *   - Frontend  (this file, imported directly)
 *   - Backend   (scan-klacksy-targets writes klacksy-page-keys.generated.json,
 *                consumed by NavigateToSkill at runtime)
 *   - Manifest  (scan-klacksy-targets emits route-level entries into
 *                navigation-targets.json for the Tier-1 matcher)
 *
 * When adding a new top-level workplace route:
 *   1. Add the Angular route definition in app-routing.module.ts as usual.
 *   2. Add a matching entry here.
 *   3. Run `npm run scan-klacksy-targets` (Klacks.Ui).
 *
 * @param pageKey - LLM-facing identifier (lowercase, kebab-case).
 * @param route - Full Angular route the user lands on (without parameter, even if hasEntityParam).
 * @param requiredPermission - Permissions.cs constant required to enter; null means "any authenticated user".
 * @param hasEntityParam - true if the destination expects an entity id appended (edit-shift/{id}, edit-employee/{id}, ...).
 */

export interface KlacksyPageKeyEntry {
  pageKey: string;
  route: string;
  requiredPermission: string | null;
  hasEntityParam: boolean;
  /**
   * Optional one-liner shown to the LLM in the navigate_to skill description
   * to disambiguate similarly-named keys (e.g. "client-list" → "employee overview").
   */
  llmHint?: string;
}

export const KLACKSY_PAGE_KEYS: readonly KlacksyPageKeyEntry[] = [
  { pageKey: 'dashboard', route: '/workplace/dashboard', requiredPermission: null, hasEntityParam: false },
  { pageKey: 'client-list', route: '/workplace/client', requiredPermission: 'CanViewClients', hasEntityParam: false, llmHint: 'employee overview' },
  { pageKey: 'new-employee', route: '/workplace/edit-address', requiredPermission: 'CanCreateClients', hasEntityParam: false, llmHint: 'create employee form' },
  { pageKey: 'edit-employee', route: '/workplace/edit-address', requiredPermission: 'CanEditClients', hasEntityParam: true, llmHint: 'edit existing employee' },
  { pageKey: 'schedule', route: '/workplace/schedule', requiredPermission: 'CanViewSchedule', hasEntityParam: false },
  { pageKey: 'absences', route: '/workplace/absence', requiredPermission: 'CanViewSchedule', hasEntityParam: false },
  { pageKey: 'client-availability', route: '/workplace/client-availability', requiredPermission: 'CanViewClients', hasEntityParam: false },
  { pageKey: 'settings', route: '/workplace/settings', requiredPermission: 'CanViewSettings', hasEntityParam: false },
  { pageKey: 'group-list', route: '/workplace/group', requiredPermission: 'CanViewGroups', hasEntityParam: false },
  { pageKey: 'new-group', route: '/workplace/edit-group', requiredPermission: 'CanCreateGroups', hasEntityParam: false, llmHint: 'create group form' },
  { pageKey: 'edit-group', route: '/workplace/edit-group', requiredPermission: 'CanEditGroups', hasEntityParam: true, llmHint: 'edit existing group' },
  { pageKey: 'group-structure', route: '/workplace/group-structure', requiredPermission: 'CanViewSettings', hasEntityParam: false },
  { pageKey: 'shift-list', route: '/workplace/shift', requiredPermission: 'CanViewShifts', hasEntityParam: false },
  { pageKey: 'new-shift', route: '/workplace/new-shift', requiredPermission: 'CanCreateShifts', hasEntityParam: false, llmHint: 'create shift template' },
  { pageKey: 'edit-shift', route: '/workplace/edit-shift', requiredPermission: 'CanEditShifts', hasEntityParam: true, llmHint: 'edit shift template' },
  { pageKey: 'cut-shift', route: '/workplace/cut-shift', requiredPermission: 'CanEditShifts', hasEntityParam: true, llmHint: 'split or trim a shift' },
  { pageKey: 'container-template', route: '/workplace/container-template', requiredPermission: 'CanEditShifts', hasEntityParam: true, llmHint: 'edit shift container template' },
  { pageKey: 'inbox', route: '/workplace/inbox', requiredPermission: null, hasEntityParam: false },
  { pageKey: 'messaging', route: '/workplace/messaging', requiredPermission: null, hasEntityParam: false },
  { pageKey: 'profile', route: '/workplace/profile', requiredPermission: null, hasEntityParam: false },
  { pageKey: 'floor-plan', route: '/workplace/floor-plan', requiredPermission: null, hasEntityParam: false },
  { pageKey: 'period-closing', route: '/workplace/period-closing', requiredPermission: 'CanEditSchedule', hasEntityParam: false },
  { pageKey: 'klacksy-training', route: '/workplace/klacksy-training', requiredPermission: 'CanEditSettings', hasEntityParam: false, llmHint: 'admin training review' },
];

export const KLACKSY_PAGE_KEYS_BY_KEY: ReadonlyMap<string, KlacksyPageKeyEntry> = new Map(
  KLACKSY_PAGE_KEYS.map((entry) => [entry.pageKey, entry]),
);
