// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Picks the report template to use for a data source.
 * Templates were classified by two competing axes, the numeric ReportType and the
 * string sourceId. This resolver makes sourceId the single axis and keeps the legacy
 * type as a fallback so templates created before the change stay reachable.
 * @param templates - All known templates
 * @param sourceId - Data source the report is printed for
 * @param defaultTemplateId - Template marked as default for that source, if any
 */

import { Injectable } from '@angular/core';
import { ReportTemplate, ReportType } from 'src/app/domain/models/report/report-template.model';

const SOURCE_TO_REPORT_TYPE: Readonly<Record<string, ReportType>> = {
  schedule: ReportType.Schedule,
  'absence-gantt': ReportType.Absence,
  'all-address': ReportType.Client,
  'edit-address': ReportType.Client,
};

@Injectable({ providedIn: 'root' })
export class ReportTemplateResolverService {
  /**
   * All templates belonging to a data source, newest classification first.
   */
  getTemplatesForSource(templates: ReportTemplate[], sourceId: string): ReportTemplate[] {
    const bySource = templates.filter(t => !t.isDeleted && t.sourceId === sourceId);
    if (bySource.length > 0) {
      return bySource;
    }

    const legacyType = SOURCE_TO_REPORT_TYPE[sourceId];
    if (legacyType === undefined) {
      return [];
    }
    return templates.filter(t => !t.isDeleted && !t.sourceId && t.type === legacyType);
  }

  /**
   * Template that should be printed: the configured default, otherwise the first match.
   */
  resolveForSource(
    templates: ReportTemplate[],
    sourceId: string,
    defaultTemplateId?: string | null
  ): ReportTemplate | undefined {
    const candidates = this.getTemplatesForSource(templates, sourceId);
    if (candidates.length === 0) {
      return undefined;
    }

    const preferred = defaultTemplateId
      ? candidates.find(t => t.id === defaultTemplateId)
      : undefined;
    return preferred ?? candidates[0];
  }

  /**
   * Keeps the legacy type in sync with the data source so both axes agree.
   */
  resolveReportType(sourceId: string | undefined, fallback: ReportType): ReportType {
    if (!sourceId) {
      return fallback;
    }
    return SOURCE_TO_REPORT_TYPE[sourceId] ?? fallback;
  }
}
