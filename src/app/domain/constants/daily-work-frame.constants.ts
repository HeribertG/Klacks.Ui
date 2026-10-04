// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Bounds and origin labels of the daily work frame (first start to last end of a work day, pauses included):
 * a frame spans at most one day; the source keys name where the applicable value comes from.
 */

export const DAILY_WORK_FRAME_MAX_HOURS = 24;

export const DAILY_SPAN_SOURCE_KEYS = {
  own: 'setting.schedulingRule.maxDailySpanSource.own',
  settings: 'setting.schedulingRule.maxDailySpanSource.settings',
  derived: 'setting.schedulingRule.maxDailySpanSource.derived',
} as const;
