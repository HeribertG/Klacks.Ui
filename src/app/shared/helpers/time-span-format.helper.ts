// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Helpers for parsing and formatting serialized .NET TimeSpan values ("[-][d.]hh:mm[:ss[.fffffff]]").
 * @param value - Serialized TimeSpan string as returned by the backend (e.g. "02:47:44.4861675")
 */

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_DAY = 86400;
const MINUTES_PER_HOUR = 60;
const TIME_SPAN_PATTERN = /^(-)?(?:(\d+)\.)?(\d+):(\d+)(?::(\d+(?:\.\d+)?))?$/;

export function parseTimeSpanToSeconds(value: string | null | undefined): number {
  if (!value) {
    return 0;
  }

  const match = value.trim().match(TIME_SPAN_PATTERN);
  if (!match) {
    return 0;
  }

  const [, sign, days, hours, minutes, seconds] = match;
  const totalSeconds =
    (days ? parseInt(days, 10) : 0) * SECONDS_PER_DAY +
    parseInt(hours, 10) * SECONDS_PER_HOUR +
    parseInt(minutes, 10) * SECONDS_PER_MINUTE +
    (seconds ? parseFloat(seconds) : 0);

  return sign ? -totalSeconds : totalSeconds;
}

export function sumTimeSpansToSeconds(values: (string | null | undefined)[]): number {
  return values.reduce((sum, value) => sum + parseTimeSpanToSeconds(value), 0);
}

export function formatSecondsAsHHMM(totalSeconds: number): string {
  const totalMinutes = Math.round(Math.abs(totalSeconds) / SECONDS_PER_MINUTE);
  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
  const minutes = totalMinutes % MINUTES_PER_HOUR;
  const formatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  return totalSeconds < 0 && totalMinutes > 0 ? `-${formatted}` : formatted;
}

export function formatTimeSpanHHMM(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  return formatSecondsAsHHMM(parseTimeSpanToSeconds(value));
}
