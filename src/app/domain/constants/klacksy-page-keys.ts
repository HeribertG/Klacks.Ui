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
 * `requiredFeature` mirrors the route guards that gate an optional feature rather
 * than a right: `featurePluginGuard(<plugin>)` for a page a feature plugin brings
 * with it (floor-plan, messaging) and InboxGuard for the inbox. Such a page exists
 * only where the feature is installed and enabled, so the backend asks the same
 * question before offering it — both in the navigate_to skill and when building the
 * chat fast-path snapshot. Listing those pages here rather than leaving them to the
 * runtime plugin registration is what keeps them in the scanner manifest at all: an
 * absent page-key makes the scanner mark its manifest target obsolete, and the
 * fast-path matcher then drops it (that is how floor-plan lost its fast path in
 * June). For a plugin page the value is the plugin name, identical to the argument
 * of its featurePluginGuard.
 *
 * `requiredPermission` is the exact right the Angular route demands: the value the route
 * carries in data[ROUTE_DATA_REQUIRED_PERMISSION] for permissionGuard, and null for a route
 * that demands none (including the feature-gated inbox, where the gate is availability, not a
 * right). Klacksy must be neither laxer nor stricter than the guard the user actually hits when
 * clicking, so it never offers a navigation that the guard would then reject, nor refuses one a
 * click would allow. Both sides therefore reference the same constants from
 * permissions.constants.ts, which mirror Klacks.Api/Domain/Constants; klacksy-page-keys-guard.spec
 * compares them route by route. See
 * docs/superpowers/specs/2026-09-12-option-b-permission-guards-design.md
 * section 3.4 for the full rule and the guard-mirroring rationale.
 *
 * `actionPermission` is the right the page-key's ACTION needs, which is stricter than the right the
 * route demands and therefore never replaces `requiredPermission`: the route entry has to stay an
 * exact mirror of the guard. A detail route is open at view level (a planer may read a group), while
 * the page-key that exists to create or change that entity is a dead end without the write right —
 * Klacksy would navigate, the page would load, and every field would be disabled. Only Klacksy reads
 * it: the scanner writes `actionPermission ?? requiredPermission` into the PAGE-level manifest entry,
 * while in-page targets keep inheriting the plain route permission, because scrolling to an anchor on
 * a readable page needs nothing more than the route itself.
 *
 * When adding a new top-level workplace route:
 *   1. Add the Angular route definition in app-routing.module.ts as usual.
 *   2. Add a matching entry here, with requiredPermission set to the very constant the route
 *      declares in its data (null if it declares none), and requiredFeature set if and only if
 *      the route carries a feature guard (featurePluginGuard or InboxGuard).
 *   3. Run `npm run scan-klacksy-targets` (Klacks.Ui).
 *
 * @param pageKey - LLM-facing identifier (lowercase, kebab-case).
 * @param route - Full Angular route the user lands on (without parameter, even if hasEntityParam).
 * @param requiredPermission - The permission or role constant the Angular route demands; null means "no right beyond a session".
 * @param actionPermission - Optional stricter right the page-key's create/edit action needs; Klacksy-only, undefined means the route permission is all it takes.
 * @param hasEntityParam - true if the destination expects an entity id appended (edit-shift/{id}, edit-employee/{id}, ...).
 * @param requiredFeature - Optional feature the installation must have for the page to exist at all, mirroring featurePluginGuard/InboxGuard; undefined means the page exists everywhere.
 */

import { FLOOR_PLAN_PLUGIN_NAME, MESSAGING_PLUGIN_NAME } from './feature-plugin.constants';
import { PERMISSIONS, ROLE_ADMIN } from './permissions.constants';

export const KLACKSY_FEATURE_INBOX = 'inbox';

export interface KlacksyPageKeyEntry {
  pageKey: string;
  route: string;
  requiredPermission: string | null;
  /**
   * Optional right the create or edit action behind this page-key needs, stricter than
   * requiredPermission. Klacksy offers the page only to a user who holds it; the Angular guard is
   * unaffected and keeps asking for requiredPermission alone.
   */
  actionPermission?: string;
  hasEntityParam: boolean;
  /**
   * Optional one-liner shown to the LLM in the navigate_to skill description
   * to disambiguate similarly-named keys (e.g. "client-list" → "employee overview").
   */
  llmHint?: string;
  /**
   * Optional feature name the installation must provide for this page to exist,
   * mirroring featurePluginGuard(name) / InboxGuard. For a plugin page it is the
   * plugin name; the inbox uses KLACKSY_FEATURE_INBOX.
   */
  requiredFeature?: string;
}

export const KLACKSY_PAGE_KEYS: readonly KlacksyPageKeyEntry[] = [
  { pageKey: 'dashboard', route: '/workplace/dashboard', requiredPermission: null, hasEntityParam: false },
  { pageKey: 'client-list', route: '/workplace/client', requiredPermission: null, hasEntityParam: false, llmHint: 'employee overview' },
  { pageKey: 'new-employee', route: '/workplace/edit-address', requiredPermission: PERMISSIONS.CanViewClients, actionPermission: PERMISSIONS.CanCreateClients, hasEntityParam: false, llmHint: 'create employee form' },
  { pageKey: 'edit-employee', route: '/workplace/edit-address', requiredPermission: PERMISSIONS.CanViewClients, actionPermission: PERMISSIONS.CanEditClients, hasEntityParam: true, llmHint: 'edit existing employee' },
  { pageKey: 'schedule', route: '/workplace/schedule', requiredPermission: null, hasEntityParam: false },
  { pageKey: 'absences', route: '/workplace/absence', requiredPermission: null, hasEntityParam: false },
  { pageKey: 'client-availability', route: '/workplace/client-availability', requiredPermission: null, hasEntityParam: false },
  { pageKey: 'settings', route: '/workplace/settings', requiredPermission: PERMISSIONS.CanViewSettings, hasEntityParam: false },
  { pageKey: 'escalations', route: '/workplace/escalations', requiredPermission: ROLE_ADMIN, hasEntityParam: false, llmHint: 'open escalation interventions list' },
  { pageKey: 'group-list', route: '/workplace/group', requiredPermission: PERMISSIONS.CanViewGroups, hasEntityParam: false },
  { pageKey: 'new-group', route: '/workplace/edit-group', requiredPermission: PERMISSIONS.CanViewGroups, actionPermission: PERMISSIONS.CanCreateGroups, hasEntityParam: false, llmHint: 'create group form' },
  { pageKey: 'edit-group', route: '/workplace/edit-group', requiredPermission: PERMISSIONS.CanViewGroups, actionPermission: PERMISSIONS.CanEditGroups, hasEntityParam: true, llmHint: 'edit existing group' },
  { pageKey: 'shift-list', route: '/workplace/shift', requiredPermission: null, hasEntityParam: false },
  { pageKey: 'new-shift', route: '/workplace/new-shift', requiredPermission: PERMISSIONS.CanCreateShifts, hasEntityParam: false, llmHint: 'create shift template' },
  { pageKey: 'new-plannable-shift', route: '/workplace/shift?create=plannable', requiredPermission: null, actionPermission: PERMISSIONS.CanCreateShifts, hasEntityParam: false, llmHint: 'create a plannable duty without a customer' },
  { pageKey: 'edit-shift', route: '/workplace/edit-shift', requiredPermission: PERMISSIONS.CanViewShifts, actionPermission: PERMISSIONS.CanEditShifts, hasEntityParam: true, llmHint: 'edit shift template' },
  { pageKey: 'cut-shift', route: '/workplace/cut-shift', requiredPermission: PERMISSIONS.CanEditShifts, hasEntityParam: true, llmHint: 'split or trim a shift' },
  { pageKey: 'container-template', route: '/workplace/container-template', requiredPermission: PERMISSIONS.CanEditShifts, hasEntityParam: true, llmHint: 'edit shift container template' },
  { pageKey: 'inbox', route: '/workplace/inbox', requiredPermission: null, hasEntityParam: false, requiredFeature: KLACKSY_FEATURE_INBOX },
  { pageKey: 'messaging', route: '/workplace/messaging', requiredPermission: null, hasEntityParam: false, llmHint: 'send and read messages to employees', requiredFeature: MESSAGING_PLUGIN_NAME },
  { pageKey: 'floor-plan', route: '/workplace/floor-plan', requiredPermission: null, hasEntityParam: false, llmHint: 'site floor plans with markers', requiredFeature: FLOOR_PLAN_PLUGIN_NAME },
  { pageKey: 'profile', route: '/workplace/profile', requiredPermission: null, hasEntityParam: false },
  { pageKey: 'period-closing', route: '/workplace/period-closing', requiredPermission: ROLE_ADMIN, hasEntityParam: false },
  { pageKey: 'klacksy-training', route: '/workplace/klacksy-training', requiredPermission: ROLE_ADMIN, hasEntityParam: false, llmHint: 'admin training review' },
];

export const KLACKSY_PAGE_KEYS_BY_KEY: ReadonlyMap<string, KlacksyPageKeyEntry> = new Map(
  KLACKSY_PAGE_KEYS.map((entry) => [entry.pageKey, entry]),
);
