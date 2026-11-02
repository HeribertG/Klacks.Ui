// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { NumberRange } from 'src/app/domain/models/settings/number-range.interface';

export const DatevNumberFields = {
  Consultant: 'consultant',
  Client: 'client',
} as const;

export type DatevNumberField = (typeof DatevNumberFields)[keyof typeof DatevNumberFields];

export const DATEV_NUMBER_FIELD_ORDER: readonly DatevNumberField[] = [
  DatevNumberFields.Consultant,
  DatevNumberFields.Client,
];

export const DATEV_NUMBER_SETTING_KEYS: Readonly<Record<DatevNumberField, string>> = {
  [DatevNumberFields.Consultant]: 'DATEV_CONSULTANT_NUMBER',
  [DatevNumberFields.Client]: 'DATEV_CLIENT_NUMBER',
};

export const DATEV_NUMBER_RANGES: Readonly<Record<DatevNumberField, NumberRange>> = {
  [DatevNumberFields.Consultant]: { min: 1001, max: 9999999 },
  [DatevNumberFields.Client]: { min: 1, max: 99999 },
};

export const DATEV_FORMAT_KEY_PREFIX = 'datev';

export const DatevNumberErrorKeys = {
  NotInteger: 'settings.exportFormats.datev.errorInteger',
  OutOfRange: 'settings.exportFormats.datev.errorRange',
  SaveFailed: 'settings.exportFormats.datev.errorSave',
} as const;

export const DATEV_NUMBER_LABEL_KEY_PREFIX = 'settings.exportFormats.datev.';
