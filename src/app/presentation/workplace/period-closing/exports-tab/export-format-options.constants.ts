// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ExportFormat } from 'src/app/infrastructure/api/period-closing/models/export-format';

export const DEFAULT_EXPORT_FORMAT: ExportFormat = 'xml';

export const FORMAT_LABEL_PREFIX = 'periodClosing.format.';

export interface ExportFormatOption {
  key: ExportFormat;
  labelKey: string;
}
