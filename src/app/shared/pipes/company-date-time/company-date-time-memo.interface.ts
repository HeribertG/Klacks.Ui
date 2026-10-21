// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { CompanyDateTimeFormat } from './company-date-time.formatter';

export interface CompanyDateTimeMemo {
  value: string | Date;
  format: CompanyDateTimeFormat;
  zone: string | null;
  locale: string;
  result: string | null;
}
