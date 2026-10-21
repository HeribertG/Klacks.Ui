// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Defaults and fixed keys of the container template editor.
 * @param CONTAINER_TEMPLATE_DEFAULT_WEEKDAYS - Monday-first weekday list shown before a container is loaded
 * @param CONTAINER_TEMPLATE_TIME_CHANGE_DEBOUNCE_MS - Delay before a changed time window rebuilds the template grid
 * @param CONTAINER_TEMPLATE_TOLERANCE_SLIDER_OPTIONS - Options of the autofill time range tolerance slider
 * @param CONTAINER_TEMPLATE_PROPERTIES_MENU_KEY - Key of the single context menu entry that opens the properties dialog
 */
import { Options } from '@angular-slider/ngx-slider';
import { TableSortingConfig } from 'src/app/presentation/services/table-sorting-config.interface';

export const CONTAINER_TEMPLATE_DEFAULT_WEEKDAYS: readonly { value: string; labelKey: string }[] = [
  { value: 'monday', labelKey: 'shift.container-template.weekday.monday' },
  { value: 'tuesday', labelKey: 'shift.container-template.weekday.tuesday' },
  { value: 'wednesday', labelKey: 'shift.container-template.weekday.wednesday' },
  { value: 'thursday', labelKey: 'shift.container-template.weekday.thursday' },
  { value: 'friday', labelKey: 'shift.container-template.weekday.friday' },
  { value: 'saturday', labelKey: 'shift.container-template.weekday.saturday' },
  { value: 'sunday', labelKey: 'shift.container-template.weekday.sunday' },
];

export const CONTAINER_TEMPLATE_DEFAULT_TIME_FROM = { hours: '06', minutes: '00' } as const;
export const CONTAINER_TEMPLATE_DEFAULT_TIME_TO = { hours: '18', minutes: '00' } as const;

export const CONTAINER_TEMPLATE_TIME_CHANGE_DEBOUNCE_MS = 500;

export const CONTAINER_TEMPLATE_DEFAULT_TOLERANCE = 50;

export const CONTAINER_TEMPLATE_TOLERANCE_SLIDER_OPTIONS: Readonly<Options> = {
  floor: 0,
  ceil: 100,
  step: 10,
  showSelectionBar: true,
  hideLimitLabels: true,
  hidePointerLabels: true,
};

export const CONTAINER_TEMPLATE_SORTING_CONFIG: Readonly<TableSortingConfig> = {
  columns: ['name', 'abbreviation', 'startShift', 'client'],
  defaultOrderBy: 'name',
  defaultSortOrder: 'asc',
  useThreeWaySort: false,
};

export const CONTAINER_TEMPLATE_ROW_DRAG_MOUSE_START_DELAY_MS = 0;

export const CONTAINER_TEMPLATE_PROPERTIES_MENU_KEY = 'properties';
export const CONTAINER_TEMPLATE_PROPERTIES_MENU_LABEL_KEY = 'shift.container-template.context-menu.properties';

export const CONTAINER_LOCK_LOCKED_BY_SELF_KEY = 'container.lock.lockedBySelf';
export const CONTAINER_LOCK_LOCKED_BY_OTHER_KEY = 'container.lock.lockedByOther';
