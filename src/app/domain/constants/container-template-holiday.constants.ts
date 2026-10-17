// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Constants for the holiday templates of container shifts.
 * @param FT_HOLIDAY_TEMPLATE_WEEKDAY - Stored weekday (Sunday=0..Saturday=6) of the single holiday template
 *   of an FT container; the backend applies it on every public holiday whatever its weekday, so one row is enough
 *   and its weekday must not follow the ticked days
 * @param FT_HOLIDAY_TEMPLATE_WEEKDAY_NAME - Weekday name matching FT_HOLIDAY_TEMPLATE_WEEKDAY
 * @param HOLIDAY_BUFFER_KEY_SUFFIX - Suffix that separates the holiday item buffer of a weekday from its normal one
 */
export const FT_HOLIDAY_TEMPLATE_WEEKDAY = 1;
export const FT_HOLIDAY_TEMPLATE_WEEKDAY_NAME = 'monday';
export const HOLIDAY_BUFFER_KEY_SUFFIX = '-holiday';
