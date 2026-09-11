// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * JSON.parse reviver that turns strings written by Date.prototype.toJSON back into the Date they
 * came from, so UI state stored via JSON.stringify (session filters, recovery drafts) restores the
 * exact instant - a local midnight stays a local midnight in every browser time zone. Only the
 * toJSON shape ("yyyy-MM-ddTHH:mm:ss.sssZ", exactly three fraction digits, literal Z) is revived;
 * the backend calendar wire formats ("yyyy-MM-dd", "...T00:00:00Z", "...T00:00:00") stay strings
 * and keep going through parseCalendarDate.
 * @param _key - Property name supplied by JSON.parse (unused)
 * @param value - Parsed JSON value; returned unchanged unless it is a serialized Date
 */

const SERIALIZED_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export function serializedDateReviver(_key: string, value: unknown): unknown {
  if (typeof value !== 'string' || !SERIALIZED_DATE_PATTERN.test(value)) {
    return value;
  }

  const revived = new Date(value);
  return isNaN(revived.getTime()) ? value : revived;
}
