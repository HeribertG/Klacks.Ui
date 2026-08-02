// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Serialises report templates for file export and validates them again on import.
 * The exported file is portable between tenants, so server-side identifiers are stripped.
 * @param template - Template to export
 * @param raw - File content of an imported template
 */

import { Injectable } from '@angular/core';
import {
  DEFAULT_PAGE_SETUP,
  ReportOrientation,
  ReportPageSize,
  ReportTemplate,
  ReportType,
} from 'src/app/domain/models/report/report-template.model';
import { ReportSection } from 'src/app/domain/models/report/report-section.model';

const EXPORT_FORMAT = 'klacks-report-template';
const EXPORT_VERSION = 1;
const FILE_NAME_FALLBACK = 'report-template';
const JSON_INDENT = 2;

interface ReportTemplateFile {
  format: string;
  version: number;
  template: ReportTemplate;
}

@Injectable({ providedIn: 'root' })
export class ReportTemplateTransferService {
  toJson(template: ReportTemplate): string {
    const payload: ReportTemplateFile = {
      format: EXPORT_FORMAT,
      version: EXPORT_VERSION,
      template: this.stripServerState(template),
    };
    return JSON.stringify(payload, null, JSON_INDENT);
  }

  buildFileName(template: ReportTemplate): string {
    const base = (template.name || FILE_NAME_FALLBACK)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return `${base || FILE_NAME_FALLBACK}.json`;
  }

  /**
   * Parses an exported file and returns a template ready to be created.
   * Throws when the file is not a report template export.
   */
  parseJson(raw: string): ReportTemplate {
    const parsed = JSON.parse(raw) as Partial<ReportTemplateFile> | ReportTemplate;
    const candidate = this.extractTemplate(parsed);

    if (!candidate || typeof candidate.name !== 'string' || !Array.isArray(candidate.sections)) {
      throw new Error('Not a report template export');
    }

    return this.normalise(candidate);
  }

  private extractTemplate(parsed: Partial<ReportTemplateFile> | ReportTemplate): ReportTemplate | undefined {
    if (parsed && typeof parsed === 'object' && 'template' in parsed && parsed.template) {
      return (parsed as ReportTemplateFile).template;
    }
    if (parsed && typeof parsed === 'object' && 'sections' in parsed) {
      return parsed as ReportTemplate;
    }
    return undefined;
  }

  private normalise(template: ReportTemplate): ReportTemplate {
    const stripped = this.stripServerState(template);
    return {
      ...stripped,
      description: stripped.description ?? '',
      type: stripped.type ?? ReportType.Schedule,
      pageSetup: {
        orientation: stripped.pageSetup?.orientation ?? ReportOrientation.Landscape,
        size: stripped.pageSetup?.size ?? ReportPageSize.A4,
        margins: { ...(stripped.pageSetup?.margins ?? DEFAULT_PAGE_SETUP.margins) },
      },
      sections: stripped.sections.map(section => this.normaliseSection(section)),
    };
  }

  private normaliseSection(section: ReportSection): ReportSection {
    return {
      ...section,
      id: undefined,
      fields: (section.fields ?? []).map(field => ({ ...field, id: undefined })),
      tableFooterFields: section.tableFooterFields?.map(field => ({ ...field, id: undefined })),
    };
  }

  private stripServerState(template: ReportTemplate): ReportTemplate {
    const copy = structuredClone(template);
    delete copy.id;
    delete copy.createdAt;
    delete copy.updatedAt;
    delete copy.isLocal;
    delete copy.isDeleted;
    return copy;
  }
}
