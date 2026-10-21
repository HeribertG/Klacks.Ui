// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { ReportPageSetup } from './report-page-setup.interface';
import { ReportSection } from './report-section.model';

/** Snapshot of a template taken before it was overwritten. */
export interface ReportTemplateVersion {
  savedAt: string;
  savedBy?: string;
  name: string;
  pageSetup: ReportPageSetup;
  sections: ReportSection[];
}
