// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Coarse structural validation for standard 5-field cron expressions before they are persisted.
 * Authoritative parsing happens in the backend (Cronos); this guard only rejects obviously
 * malformed input, because an invalid persisted expression silently stops the ERP import.
 * @param expression - Cron expression candidate (minute hour day month weekday)
 */

const CRON_FIELD_COUNT = 5;
const CRON_NAME_TOKEN_PATTERN = /JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC|SUN|MON|TUE|WED|THU|FRI|SAT/g;
const CRON_FIELD_PATTERN = /^[\d*,\-/?#LW]+$/;
const CRON_FIELD_SEPARATOR = /\s+/;

export function isValidCronExpression(expression: string): boolean {
  const fields = expression.trim().split(CRON_FIELD_SEPARATOR);
  if (fields.length !== CRON_FIELD_COUNT) {
    return false;
  }
  return fields.every(isValidCronField);
}

function isValidCronField(field: string): boolean {
  const normalized = field.toUpperCase().replace(CRON_NAME_TOKEN_PATTERN, '0');
  return CRON_FIELD_PATTERN.test(normalized);
}
