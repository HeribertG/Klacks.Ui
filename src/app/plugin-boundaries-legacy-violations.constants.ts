// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Shrink-only list of plugin imports into the host (src/) that already existed when the plugin boundary guard was
 * introduced. Key: importing plugin file relative to the Klacks.Ui root; value: the forbidden import targets.
 * plugin-boundaries.guard.spec.ts fails on any new entry and on any entry that no longer exists - only delete entries.
 */
export const LEGACY_PLUGIN_BOUNDARY_VIOLATIONS: Readonly<Record<string, readonly string[]>> = {
  'projects/klacks-plugin-floor-plan/src/lib/application/services/floor-plan-marker-enrichment.service.ts': [
    'src/app/infrastructure/api/client/data-client.service.ts',
  ],
  'projects/klacks-plugin-floor-plan/src/lib/floor-plan-home/floor-plan-home.component.ts': [
    'src/app/application/services/search.service.ts',
    'src/app/domain/models/schedule/work-schedule-entry-type.enum.ts',
    'src/app/domain/models/schedule/work-schedule-filter.interface.ts',
    'src/app/infrastructure/api/schedule/data-work-schedule.service.ts',
    'src/app/presentation/services/layout.service.ts',
  ],
  'projects/klacks-plugin-floor-plan/src/lib/floor-plan-list/floor-plan-list.component.ts': [
    'src/app/presentation/shared/simple-pagination/simple-pagination.component.ts',
  ],
  'projects/klacks-plugin-floor-plan/src/lib/floor-plan-toolbar/floor-plan-toolbar.component.ts': [
    'src/app/presentation/icons/icon-fp-circle.component.ts',
    'src/app/presentation/icons/icon-fp-eraser.component.ts',
    'src/app/presentation/icons/icon-fp-export.component.ts',
    'src/app/presentation/icons/icon-fp-import.component.ts',
    'src/app/presentation/icons/icon-fp-line.component.ts',
    'src/app/presentation/icons/icon-fp-pencil.component.ts',
    'src/app/presentation/icons/icon-fp-polygon.component.ts',
    'src/app/presentation/icons/icon-fp-rectangle.component.ts',
    'src/app/presentation/icons/icon-fp-redo.component.ts',
    'src/app/presentation/icons/icon-fp-select.component.ts',
    'src/app/presentation/icons/icon-fp-text.component.ts',
    'src/app/presentation/icons/icon-fp-undo.component.ts',
    'src/app/presentation/icons/icon-fp-zoom-minus.component.ts',
    'src/app/presentation/icons/icon-fp-zoom-plus.component.ts',
  ],
  'projects/klacks-plugin-floor-plan/src/lib/floor-plan-work-panel/floor-plan-work-panel.component.ts': [
    'src/app/domain/enums/shift-filter-type.enum.ts',
    'src/app/domain/models/shift/shift-filter-class.ts',
    'src/app/domain/models/shift/shift.interface.ts',
    'src/app/infrastructure/api/shift/data-shift.service.ts',
  ],
  'projects/klacks-plugin-floor-plan/src/lib/infrastructure/data-floor-plan.service.ts': [
    'src/environments/environment.ts',
  ],
  'projects/klacks-plugin-floor-plan/src/lib/settings/floor-plan-settings/floor-plan-settings-row/floor-plan-settings-row.component.ts': [
    'src/app/presentation/icons/icon-copy-grey.component.ts',
    'src/app/presentation/icons/trash-icon-red.component.ts',
  ],
  'projects/klacks-plugin-floor-plan/src/lib/settings/floor-plan-settings/floor-plan-settings.component.ts': [
    'src/app/domain/constants/messages.ts',
    'src/app/presentation/modal/modal-type.enum.ts',
    'src/app/presentation/modal/modal.service.ts',
    'src/app/presentation/shared/settings-list-card/settings-list-card.component.ts',
    'src/app/presentation/toast/toast-show.service.ts',
  ],
};
