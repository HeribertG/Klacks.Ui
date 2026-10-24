// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Pure rule for a break (absence) recorded in duration mode, mirroring the backend predicate
 * BreakDurationPredicate.HasDirectlyRecordedDuration. In duration mode no times exist, so both
 * bounds are equal and the hours live in workTime; the backend keeps such a workTime untouched,
 * while any other break gets its hours recomputed by the break macro for the target employee.
 * @param startTime - Start bound of the break as the backend serializes it (for example "00:00:00")
 * @param endTime - End bound of the break in the same format as startTime
 * @param workTime - Hours stored on the break; a schedule cell carries them in changeTime
 */

const NO_WORK_TIME = 0;

export function hasDirectlyRecordedBreakDuration(
  startTime: string,
  endTime: string,
  workTime: number | null | undefined,
): boolean {
  return startTime === endTime && (workTime ?? NO_WORK_TIME) > NO_WORK_TIME;
}

export function breakWorkTimeToCarry(
  startTime: string,
  endTime: string,
  workTime: number | null | undefined,
): number {
  return hasDirectlyRecordedBreakDuration(startTime, endTime, workTime) ? (workTime as number) : NO_WORK_TIME;
}
