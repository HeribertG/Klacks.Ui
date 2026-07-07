// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ExportFormat } from 'src/app/infrastructure/api/period-closing/models/export-format';

export const DEFAULT_EXPORT_FORMAT: ExportFormat = 'xml';

export const EXPORT_FORMAT_OPTIONS: readonly { key: ExportFormat; labelKey: string }[] = [
  { key: 'csv',   labelKey: 'periodClosing.format.csv' },
  { key: 'json',  labelKey: 'periodClosing.format.json' },
  { key: 'xml',   labelKey: 'periodClosing.format.xml' },
  { key: 'datev', labelKey: 'periodClosing.format.datev' },
  { key: 'bmd',   labelKey: 'periodClosing.format.bmd' },
];
