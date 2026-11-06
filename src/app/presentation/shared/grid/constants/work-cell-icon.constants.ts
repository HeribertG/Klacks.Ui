// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Canvas icon names of a work cell in the schedule grid. Every name must have a case in
 * CellIconsService.getSvgForIcon; an unknown name is skipped silently when the cell is drawn.
 * @param WORK_CONFIRMED_ICON - Work confirmed (lock level 1)
 * @param WORK_APPROVED_ICON - Work approved (lock level 2)
 * @param WORK_CLOSED_ICON - Work closed (lock level 3)
 * @param WORK_MOVED_ICON - Work taken over from another person (cover move, movedFromClientId)
 */
export const WORK_CONFIRMED_ICON = 'pp-icon-work-confirmed';

export const WORK_APPROVED_ICON = 'pp-icon-work-approved';

export const WORK_CLOSED_ICON = 'pp-icon-work-closed';

export const WORK_MOVED_ICON = 'pp-icon-work-moved';
