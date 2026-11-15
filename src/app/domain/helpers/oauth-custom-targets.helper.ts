// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Local mirror of the server rules for own OAuth redirect targets, used to validate input early and to read and write the JSON list of the OAUTH_CUSTOM_REDIRECT_TARGETS setting.
 */

import {
  OAUTH_CUSTOM_TARGET_DEFAULT_PORT,
  OAUTH_CUSTOM_TARGET_ERROR,
  OAUTH_CUSTOM_TARGET_HTTPS_PREFIX,
  OAUTH_CUSTOM_TARGET_MAX_ENTRIES,
  OAUTH_CUSTOM_TARGET_MAX_LABEL_LENGTH,
  OAUTH_CUSTOM_TARGET_MAX_LENGTH,
} from 'src/app/domain/constants/oauth-connection.constants';
import { OAuthCustomTargetCheck } from 'src/app/domain/models/settings/oauth-custom-target-check.interface';

const FORBIDDEN_CHARACTERS = '?#\\@%';
const PORT_SEPARATOR = ':';
const PATH_SEPARATOR = '/';
const HOST_SEPARATOR = '.';
const LABEL_HYPHEN = '-';
const LOCALHOST = 'localhost';
const MAX_ASCII_CODE = 127;
const MAX_CONTROL_CODE = 31;
const LABEL_PATTERN = /^[a-z0-9-]+$/;
const SEGMENT_PATTERN = /^[A-Za-z0-9._~-]+$/;
const WHITESPACE_PATTERN = /\s/;
const NUMERIC_LABEL_PATTERN = /^(\d+|0x[0-9a-f]*)$/;
const CURRENT_DIRECTORY_SEGMENT = '.';
const PARENT_DIRECTORY_SEGMENT = '..';

function fail(errorKey: string): OAuthCustomTargetCheck {
  return { canonical: '', errorKey };
}

function hasControlCharacter(text: string): boolean {
  return [...text].some((character) => {
    const code = character.charCodeAt(0);
    return code <= MAX_CONTROL_CODE || code === MAX_ASCII_CODE;
  });
}

function isAscii(text: string): boolean {
  return [...text].every((character) => character.charCodeAt(0) <= MAX_ASCII_CODE);
}

function toAsciiHost(hostText: string): string | null {
  if (isAscii(hostText)) {
    return hostText.toLowerCase();
  }
  try {
    return new URL(`${OAUTH_CUSTOM_TARGET_HTTPS_PREFIX}${hostText}`).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isValidLabel(label: string): boolean {
  return (
    label.length > 0 &&
    label.length <= OAUTH_CUSTOM_TARGET_MAX_LABEL_LENGTH &&
    LABEL_PATTERN.test(label) &&
    !label.startsWith(LABEL_HYPHEN) &&
    !label.endsWith(LABEL_HYPHEN)
  );
}

function isValidPath(path: string): boolean {
  if (path === '') {
    return true;
  }
  const segments = path.split(PATH_SEPARATOR).slice(1);
  if (segments[segments.length - 1] === '') {
    segments.pop();
  }
  return segments.every(
    (segment) =>
      SEGMENT_PATTERN.test(segment) &&
      segment !== CURRENT_DIRECTORY_SEGMENT &&
      segment !== PARENT_DIRECTORY_SEGMENT,
  );
}

function checkHost(authority: string): { host: string; errorKey: string | null } {
  let hostText = authority;
  const portIndex = authority.lastIndexOf(PORT_SEPARATOR);
  if (portIndex >= 0) {
    if (authority.slice(portIndex + 1) !== OAUTH_CUSTOM_TARGET_DEFAULT_PORT) {
      return { host: '', errorKey: OAUTH_CUSTOM_TARGET_ERROR.Port };
    }
    hostText = authority.slice(0, portIndex);
  }
  if (hostText.length === 0) {
    return { host: '', errorKey: OAUTH_CUSTOM_TARGET_ERROR.HostMissing };
  }
  const ascii = toAsciiHost(hostText);
  if (ascii === null || !ascii.split(HOST_SEPARATOR).every(isValidLabel)) {
    return { host: '', errorKey: OAUTH_CUSTOM_TARGET_ERROR.HostInvalid };
  }
  if (ascii.split(HOST_SEPARATOR).every((label) => NUMERIC_LABEL_PATTERN.test(label))) {
    return { host: '', errorKey: OAUTH_CUSTOM_TARGET_ERROR.IpAddress };
  }
  if (ascii === LOCALHOST) {
    return { host: '', errorKey: OAUTH_CUSTOM_TARGET_ERROR.Localhost };
  }
  return { host: ascii, errorKey: null };
}

/**
 * Checks one target against the server rules and returns its canonical form (lower-case punycode host, path as written).
 * @param input - Target as typed by the administrator
 * @returns The canonical form, or an empty canonical form with the i18n key of the first violated rule
 */
export function checkOAuthCustomTarget(input: string): OAuthCustomTargetCheck {
  const trimmed = (input ?? '').trim();
  if (trimmed.length === 0) {
    return fail(OAUTH_CUSTOM_TARGET_ERROR.Empty);
  }
  if (trimmed.length > OAUTH_CUSTOM_TARGET_MAX_LENGTH) {
    return fail(OAUTH_CUSTOM_TARGET_ERROR.TooLong);
  }
  if (!trimmed.toLowerCase().startsWith(OAUTH_CUSTOM_TARGET_HTTPS_PREFIX)) {
    return fail(OAUTH_CUSTOM_TARGET_ERROR.NotHttps);
  }

  const rest = trimmed.slice(OAUTH_CUSTOM_TARGET_HTTPS_PREFIX.length);
  if (
    [...FORBIDDEN_CHARACTERS].some((character) => rest.includes(character)) ||
    WHITESPACE_PATTERN.test(rest) ||
    hasControlCharacter(rest)
  ) {
    return fail(OAUTH_CUSTOM_TARGET_ERROR.ForbiddenCharacters);
  }

  const pathStart = rest.indexOf(PATH_SEPARATOR);
  const authority = pathStart < 0 ? rest : rest.slice(0, pathStart);
  const path = pathStart < 0 ? '' : rest.slice(pathStart);

  const hostCheck = checkHost(authority);
  if (hostCheck.errorKey !== null) {
    return fail(hostCheck.errorKey);
  }
  if (!isValidPath(path)) {
    return fail(OAUTH_CUSTOM_TARGET_ERROR.Path);
  }

  return { canonical: `${OAUTH_CUSTOM_TARGET_HTTPS_PREFIX}${hostCheck.host}${path}`, errorKey: null };
}

/**
 * Checks a target about to be added to the list: the server rules, the duplicate check and the entry limit.
 * @param existing - Targets already in the list, in canonical form
 * @param input - Target as typed by the administrator
 * @returns The canonical form, or an empty canonical form with the i18n key of the violated rule
 */
export function checkNewOAuthCustomTarget(existing: readonly string[], input: string): OAuthCustomTargetCheck {
  if (existing.length >= OAUTH_CUSTOM_TARGET_MAX_ENTRIES) {
    return fail(OAUTH_CUSTOM_TARGET_ERROR.LimitReached);
  }
  const check = checkOAuthCustomTarget(input);
  if (check.errorKey !== null) {
    return check;
  }
  return existing.includes(check.canonical) ? fail(OAUTH_CUSTOM_TARGET_ERROR.Duplicate) : check;
}

/**
 * Reads the stored JSON array of the custom targets setting the way the server does: entries are canonicalised, invalid
 * entries and duplicates are skipped, and anything that is not an array of strings yields an empty list.
 * @param json - Stored value of the setting
 * @returns The canonical targets in stored order
 */
export function parseOAuthCustomTargets(json: string): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) {
    return [];
  }

  const targets: string[] = [];
  for (const entry of parsed) {
    if (typeof entry !== 'string') {
      continue;
    }
    const check = checkOAuthCustomTarget(entry);
    if (check.errorKey === null && !targets.includes(check.canonical)) {
      targets.push(check.canonical);
    }
  }
  return targets;
}

/**
 * Writes the custom targets as the JSON array stored in the setting; an empty list is stored as "[]", never as an empty string.
 * @param targets - Targets to store, in canonical form
 * @returns The JSON array text
 */
export function serializeOAuthCustomTargets(targets: readonly string[]): string {
  return JSON.stringify(targets);
}
