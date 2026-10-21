// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Shrink-only list of production files that still declare more than one top-level class or interface, keyed by path
 * relative to Klacks.Ui with the number of declarations allowed. one-class-interface-per-file.guard.spec.ts fails on
 * any unlisted file with more than one declaration, on any listed file that grew, and on any entry whose count already
 * dropped. Never add an entry; the target state is an empty list.
 */
export const MULTI_DECLARATION_FILES: Readonly<Record<string, number>> = {
  'projects/klacks-plugin-contracts/src/lib/plugin-voice.ts': 3,
  'projects/klacks-plugin-floor-plan/src/lib/application/services/floor-plan-marker-enrichment.service.ts': 2,
  'projects/klacks-plugin-floor-plan/src/lib/domain/models/floor-plan-class.ts': 2,
  'projects/klacks-plugin-floor-plan/src/lib/domain/models/floor-plan-work-marker-class.ts': 2,
  'projects/klacks-plugin-floor-plan/src/lib/floor-plan-property-panel/floor-plan-property-panel.component.ts': 3,
  'projects/klacks-plugin-floor-plan/src/lib/services/floor-plan-anchor-snap.service.ts': 3,
  'projects/klacks-plugin-floor-plan/src/lib/services/floor-plan-canvas.service.ts': 3,
  'projects/klacks-plugin-floor-plan/src/lib/services/floor-plan-connector.service.ts': 4,
  'projects/klacks-plugin-floor-plan/src/lib/services/floor-plan-import.service.ts': 3,
  'projects/klacks-plugin-floor-plan/src/lib/services/floor-plan-join.service.ts': 3,
  'projects/klacks-plugin-floor-plan/src/lib/services/floor-plan-layer.service.ts': 2,
  'projects/klacks-plugin-floor-plan/src/lib/services/floor-plan-point-editor.service.ts': 2,
  'projects/klacks-plugin-floor-plan/src/lib/services/floor-plan-work-drop.service.ts': 2,
  'projects/klacks-plugin-messaging/src/lib/components/client-messenger-contacts/client-messenger-contacts.component.ts': 2,
  'projects/klacks-plugin-messaging/src/lib/models/messenger-contact.model.ts': 2,
  'projects/klacks-plugin-messaging/src/lib/models/user-messenger-contact.model.ts': 2,
  'projects/klacks-plugin-messaging/src/lib/services/data-messaging.service.ts': 3,
  'projects/klacks-plugin-messaging/src/lib/settings/owner-messengers/owner-messengers.component.ts': 2,
  'src/app/domain/models/absence/absence-class.ts': 2,
  'src/app/domain/models/break/break-class.ts': 2,
  'src/app/domain/models/calendar/calendar-rule-class.ts': 2,
  'src/app/domain/models/schedule/schedule-class.ts': 2,
  'src/app/domain/models/scheduling/individual-period.model.ts': 2,
};
