// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Limits of creating and converting stand-ins, mirrored from Klacks.Api StandInConstants and ClientFieldLimits, so the
 * dialogs refuse what the server would refuse (its validation texts are English only) before anything is sent.
 */

export const STAND_IN_MAX_BULK_COUNT = 50;

export const STAND_IN_INDEX_PLACEHOLDER = '{n}';

export const STAND_IN_MAX_NAME_PATTERN_LENGTH = 90;

export const STAND_IN_PERSON_NAME_MAX_LENGTH = 100;

/** Path segment of both stand-in endpoints (create and convert); their failures are explained by the dialogs. */
export const STAND_IN_API_PATH = 'Clients/StandIns';

export const STAND_IN_CONVERT_PATH_SUFFIX = 'Convert';

/** Sign that marks a stand-in in the schedule row header and in the employee list. */
export const STAND_IN_SYMBOL = '◌';

/** i18n keys of the stand-in dialogs' refusals and failures (a refused address reuses the client form's key). */
export const STAND_IN_I18N = {
  invalidCount: 'standIn.create.invalid.count',
  invalidPattern: 'standIn.create.invalid.pattern',
  invalidGroup: 'standIn.create.invalid.group',
  invalidPeriod: 'standIn.create.invalid.period',
  createFailed: 'standIn.create.failed',
  invalidPerson: 'standIn.convert.invalid.person',
  invalidAddress: 'standIn.convert.invalid.address',
  convertFailed: 'standIn.convert.failed',
} as const;
