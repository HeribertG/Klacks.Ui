// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { FieldStyle } from './report-field.model';

export interface FreeTextRow {
  id?: string;
  text: string;
  position: 'before' | 'after';
  style: FieldStyle;
}
