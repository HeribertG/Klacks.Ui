// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Formats client availability strings as tooltip text: per section the label, then one "start – end" line per range.
 * Sections without ranges are left out; a range that is not "start-end" is shown as it is.
 * @param rangesString - Comma-separated ranges, each "HH:mm-HH:mm"
 * @param label - Translated heading of the section
 * @param sections - Available and blocked ranges of one client day, each with its translated heading
 */

import { IAvailabilityTooltipSection } from 'src/app/domain/models/schedule/availability-tooltip-section.interface';

const RANGE_SEPARATOR = ',';
const RANGE_BOUND_SEPARATOR = '-';
const RANGE_BOUND_COUNT = 2;
const LINE_SEPARATOR = '\n';

export function formatAvailabilityTooltip(rangesString: string, label: string): string {
  const ranges = rangesString.split(RANGE_SEPARATOR);
  const formattedRanges = ranges
    .map(range => {
      const parts = range.trim().split(RANGE_BOUND_SEPARATOR);
      if (parts.length === RANGE_BOUND_COUNT) {
        return `${parts[0]} – ${parts[1]}`;
      }
      return range;
    })
    .join(LINE_SEPARATOR);

  return `${label}:${LINE_SEPARATOR}${formattedRanges}`;
}

export function formatAvailabilityTooltipSections(sections: readonly IAvailabilityTooltipSection[]): string | undefined {
  const parts: string[] = [];
  for (const section of sections) {
    if (section.ranges) {
      parts.push(formatAvailabilityTooltip(section.ranges, section.label));
    }
  }
  return parts.length > 0 ? parts.join(LINE_SEPARATOR) : undefined;
}
