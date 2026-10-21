// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ReportScript } from './report-script.enum';

export interface ScriptRange {
  script: ReportScript;
  from: number;
  to: number;
}
