// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Constants of the employee import: limits mirrored from the backend ClientImportLimits, the issue and
 * file and request error codes of the API contract, the issue fields and issue argument names the preview
 * reads, the translation key prefixes the UI resolves them with, the singular/plural keys of the count texts,
 * the info issue codes collected in one notes block above the preview table, and the default rules applied
 * to rows with missing information.
 */

import {
  ClientImportDateFormat,
  ClientImportDuplicateHandling,
  ClientImportEmailType,
  ClientImportFormerEmployeesHandling,
  ClientImportMobileType,
  ClientImportPhoneType,
  ClientImportTarget,
} from 'src/app/domain/enums/client-import.enums';
import { IClientImportPolicy } from 'src/app/domain/models/client-import/i-client-import-policy';
import { IClientImportCountKeys } from 'src/app/domain/models/client-import/i-client-import-count-keys';

const BYTES_PER_MEGABYTE = 1024 * 1024;
const MAX_FILE_SIZE_MEGABYTES = 5;

export const CLIENT_IMPORT_MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MEGABYTES * BYTES_PER_MEGABYTE;
export const CLIENT_IMPORT_ACCEPTED_EXTENSIONS = ['.xlsx', '.csv'] as const;
export const CLIENT_IMPORT_FILE_INPUT_ACCEPT = CLIENT_IMPORT_ACCEPTED_EXTENSIONS.join(',');
export const CLIENT_IMPORT_PREVIEW_DEBOUNCE_MS = 400;
export const CLIENT_IMPORT_PREVIEW_IMMEDIATE_MS = 0;

export const CLIENT_IMPORT_API_SEGMENT = 'ClientImport';
export const CLIENT_IMPORT_PARSE_PATH = 'Parse';
export const CLIENT_IMPORT_PREVIEW_PATH = 'Preview';
export const CLIENT_IMPORT_COMMIT_PATH = 'Commit';
export const CLIENT_IMPORT_TEMPLATE_PATH = 'Template';
export const CLIENT_IMPORT_FILE_FORM_FIELD = 'file';
export const CLIENT_IMPORT_SHEET_FORM_FIELD = 'sheetName';
export const CLIENT_IMPORT_LANGUAGE_PARAM = 'language';
export const CLIENT_IMPORT_TEMPLATE_FILE_NAME_PREFIX = 'klacks-employee-import-';
export const CLIENT_IMPORT_TEMPLATE_FILE_EXTENSION = '.xlsx';
export const CLIENT_IMPORT_TEMPLATE_FALLBACK_LANGUAGE = 'en';

export const CLIENT_IMPORT_ROUTE = '/workplace/client/import';
export const CLIENT_IMPORT_LIST_ROUTE = '/workplace/client';
export const CLIENT_IMPORT_GROUP_QUERY_PARAM = 'groupId';

export const CLIENT_IMPORT_ISSUE_KEY_PREFIX = 'clientImport.issue.';
export const CLIENT_IMPORT_TARGET_KEY_PREFIX = 'clientImport.target.';
export const CLIENT_IMPORT_FILE_ERROR_KEY_PREFIX = 'clientImport.fileError.';
export const CLIENT_IMPORT_ISSUE_REASON_KEY_PREFIX = 'clientImport.issueReason.';
export const CLIENT_IMPORT_REQUEST_ERROR_KEY_PREFIX = 'clientImport.error.';
export const CLIENT_IMPORT_GENERIC_ERROR_KEY = 'clientImport.error.generic';
export const CLIENT_IMPORT_COMMIT_ERROR_KEY = 'clientImport.error.commit';
export const CLIENT_IMPORT_PREVIEW_ERROR_KEY = 'clientImport.error.preview';
export const CLIENT_IMPORT_ALREADY_COMMITTED_KEY = 'clientImport.error.alreadyCommitted';

export const CLIENT_IMPORT_ISSUE_CODES = [
  'missing-last-name',
  'missing-first-name',
  'missing-gender',
  'gender-from-salutation',
  'invalid-date',
  'ambiguous-two-digit-year',
  'invalid-email',
  'unknown-country',
  'unknown-contract',
  'unknown-group',
  'contract-from-policy',
  'group-from-policy',
  'entry-date-from-policy',
  'entry-date-implausible',
  'former-employee-skipped',
  'duplicate-in-file',
  'duplicate-in-database',
  'possible-duplicate-name',
  'missing-address',
  'zip-city-split',
  'multi-word-name',
  'personnel-number-not-imported',
  'value-too-long',
] as const;

export const CLIENT_IMPORT_SYSTEM_SKIP_ISSUE_CODES: readonly string[] = [
  'former-employee-skipped',
  'duplicate-in-file',
  'duplicate-in-database',
];

export const CLIENT_IMPORT_ISSUE_ARG_ROW = 'row';
export const CLIENT_IMPORT_ISSUE_ARG_DATE = 'date';
export const CLIENT_IMPORT_ISSUE_ARG_VALUE = 'value';
export const CLIENT_IMPORT_ISSUE_ARG_REASON = 'reason';

export const CLIENT_IMPORT_ISSUE_REASON_EXIT_BEFORE_ENTRY = 'exit-before-entry';

export const CLIENT_IMPORT_ISSUE_REASONS: Readonly<Record<string, readonly string[]>> = {
  'invalid-date': ['future', CLIENT_IMPORT_ISSUE_REASON_EXIT_BEFORE_ENTRY],
  'unknown-contract': ['ambiguous'],
  'unknown-group': ['ambiguous'],
  'zip-city-split': ['not-split'],
};

export const CLIENT_IMPORT_FIELDS = {
  firstName: 'firstName',
  lastName: 'lastName',
  title: 'title',
  gender: 'gender',
  birthdate: 'birthdate',
  street: 'street',
  zip: 'zip',
  city: 'city',
  country: 'country',
  email: 'email',
  phone: 'phone',
  mobile: 'mobile',
  entryDate: 'entryDate',
  exitDate: 'exitDate',
  contractName: 'contractName',
  groupName: 'groupName',
} as const;

export const CLIENT_IMPORT_ISSUE_CODE_MISSING_GENDER = 'missing-gender';

export const CLIENT_IMPORT_SUMMARY_ISSUE_CODES: readonly string[] = [
  'contract-from-policy',
  'group-from-policy',
  'entry-date-from-policy',
  'zip-city-split',
  'personnel-number-not-imported',
];

export const CLIENT_IMPORT_SUMMARY_ISSUE_CODES_WITHOUT_TEXT_ARGS: readonly string[] = [
  'zip-city-split',
  'personnel-number-not-imported',
];

export const CLIENT_IMPORT_SUMMARY_ISSUE_TARGETS: Readonly<Partial<Record<ClientImportTarget, string>>> = {
  [ClientImportTarget.PersonnelNumber]: 'personnel-number-not-imported',
};

export const CLIENT_IMPORT_COUNT_KEYS = {
  rowCount: { one: 'clientImport.mapping.rowCount.one', other: 'clientImport.mapping.rowCount.other' },
  commit: { one: 'clientImport.action.commit.one', other: 'clientImport.action.commit.other' },
  total: { one: 'clientImport.preview.total.one', other: 'clientImport.preview.total.other' },
  ready: { one: 'clientImport.preview.ready.one', other: 'clientImport.preview.ready.other' },
  skipped: { one: 'clientImport.preview.skipped.one', other: 'clientImport.preview.skipped.other' },
  errors: { one: 'clientImport.preview.errors.one', other: 'clientImport.preview.errors.other' },
  duplicates: { one: 'clientImport.preview.duplicates.one', other: 'clientImport.preview.duplicates.other' },
  warnings: { one: 'clientImport.preview.warnings.one', other: 'clientImport.preview.warnings.other' },
  commitBlocked: { one: 'clientImport.preview.commitBlocked.one', other: 'clientImport.preview.commitBlocked.other' },
  created: { one: 'clientImport.result.created.one', other: 'clientImport.result.created.other' },
  resultSkipped: { one: 'clientImport.result.skipped.one', other: 'clientImport.result.skipped.other' },
  geocodingQueued: {
    one: 'clientImport.result.geocodingQueued.one',
    other: 'clientImport.result.geocodingQueued.other',
  },
} as const satisfies Readonly<Record<string, IClientImportCountKeys>>;

export const CLIENT_IMPORT_FILE_ERROR_CODES = [
  'file-too-large',
  'file-unsupported',
  'file-empty',
  'too-many-rows',
  'too-many-columns',
  'no-header-row',
  'unpacked-size-exceeded',
] as const;

export const CLIENT_IMPORT_REQUEST_ERROR_CODES = [
  'invalid-request',
  'invalid-policy',
  'rows-have-errors',
  'unsupported-language',
] as const;

export const CLIENT_IMPORT_ERROR_CODE_UNSUPPORTED_LANGUAGE = 'unsupported-language';
export const CLIENT_IMPORT_ERROR_CODE_ALREADY_COMMITTED = 'already-committed';
export const CLIENT_IMPORT_FILE_ERROR_TOO_LARGE = 'file-too-large';
export const CLIENT_IMPORT_FILE_ERROR_UNSUPPORTED = 'file-unsupported';
export const CLIENT_IMPORT_UNKNOWN_ERROR_CODE = 'unknown';

export const CLIENT_IMPORT_BAD_REQUEST_STATUS = 400;
export const CLIENT_IMPORT_PAYLOAD_TOO_LARGE_STATUS = 413;
export const CLIENT_IMPORT_CONFLICT_STATUS = 409;

export const CLIENT_IMPORT_TARGETS: readonly ClientImportTarget[] = Object.values(ClientImportTarget);

export const CLIENT_IMPORT_DATE_TARGETS: readonly ClientImportTarget[] = [
  ClientImportTarget.Birthdate,
  ClientImportTarget.EntryDate,
  ClientImportTarget.ExitDate,
];

export const CLIENT_IMPORT_AMBIGUOUS_DATE_FORMAT_DEFAULT = ClientImportDateFormat.DayMonthYear;

export const CLIENT_IMPORT_DEFAULT_POLICY: Readonly<IClientImportPolicy> = {
  contractId: null,
  groupId: null,
  entryDate: null,
  defaultCountry: null,
  emailType: ClientImportEmailType.PrivateMail,
  phoneType: ClientImportPhoneType.PrivateFixPhone,
  mobileType: ClientImportMobileType.PrivateCellPhone,
  formerEmployees: ClientImportFormerEmployeesHandling.Skip,
  duplicates: ClientImportDuplicateHandling.Skip,
};
