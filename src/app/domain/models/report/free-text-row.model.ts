// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { FieldStyle } from './report-field.model';

export interface FreeTextRow {
  id?: string;
  text: string;
  position: 'before' | 'after';
  style: FieldStyle;
}
