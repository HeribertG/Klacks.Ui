// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Shrink-only ceilings for the production .ts and .html files that exceed the 800-line limit, keyed by path relative to
 * Klacks.Ui with the line count they had when the size guard was introduced (2026-10-23). source-file-size.guard.spec.ts
 * fails when a listed file grows, when a listed file is back at or under the limit, and when a ceiling is higher than the
 * current size of its file - so an entry must be deleted or lowered in the same change that shrinks the file. Never add an
 * entry and never raise a ceiling: split the file instead. The target state is an empty list.
 */
export const FILE_SIZE_CEILINGS: Readonly<Record<string, number>> = {
  'projects/klacks-plugin-floor-plan/src/lib/services/floor-plan-canvas.service.ts': 1262,
  'src/app/domain/services/report/report-data-provider.service.ts': 1160,
  'src/app/domain/services/report/report-pdf.service.ts': 1169,
  'src/app/domain/services/settings/app-settings-management.service.ts': 830,
  'src/app/presentation/shared/grid/body/directives/grid-template-events.directive.ts': 940,
  'src/app/presentation/shared/time-ruler/services/time-ruler-drag-drop.service.ts': 965,
  'src/app/presentation/shared/time-ruler/services/time-ruler-render.service.ts': 1027,
  'src/app/presentation/workplace/schedule/schedule-section/services/schedule-data.service.ts': 1047,
  'src/app/presentation/workplace/settings/settings-home/settings-home.component.html': 1118,
  'src/app/presentation/workplace/shift/container-template/container-template.component.html': 1104,
};
