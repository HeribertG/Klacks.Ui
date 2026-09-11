// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Converts the groups attached to a shift into their wire form before sending. Group dates the UI
 * created itself (local-midnight Date instances, e.g. picked in the group selection) are sent as UTC
 * midnight of their own day; values that still hold the backend's wire string are passed through
 * unchanged, because the backend already produced them (including DateTime.MinValue for group items
 * without a start date, which a calendar-date parser cannot represent).
 * @param groups - Groups of the shift as held by the UI; undefined when the shift carries no groups
 */

import { Group } from 'src/app/domain/models/group/group-class';
import { toCalendarDateWire } from 'src/app/shared/helpers/calendar-date.helper';

export function toShiftGroupsWire(groups: Group[] | undefined) {
  return groups?.map((group) => ({
    ...group,
    validFrom: group.validFrom instanceof Date ? toCalendarDateWire(group.validFrom) : group.validFrom,
    validUntil: group.validUntil instanceof Date ? toCalendarDateWire(group.validUntil) : group.validUntil,
  }));
}
