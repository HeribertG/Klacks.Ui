// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Formats a client availability string as tooltip text: the label, then one "start – end" line per range.
 * A range that is not "start-end" is shown as it is.
 * @param rangesString - Comma-separated ranges, each "HH:mm-HH:mm"
 * @param label - Translated heading of the tooltip
 */

const RANGE_SEPARATOR = ',';
const RANGE_BOUND_SEPARATOR = '-';
const RANGE_BOUND_COUNT = 2;

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
    .join('\n');

  return `${label}:\n${formattedRanges}`;
}
