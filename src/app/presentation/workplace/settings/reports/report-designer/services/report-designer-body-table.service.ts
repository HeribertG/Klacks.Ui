// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Layout of the body tables of the report designer: adding and removing tables, title, width and
 * full-period flag of a table, and the column width summary with even distribution.
 * @param section - Body table the command applies to
 */

import { Injectable, inject } from '@angular/core';

import { ReportSection } from 'src/app/domain/models/report/report-section.model';
import { ReportSectionType } from 'src/app/domain/models/report/report-section-type.enum';
import {
  COLUMN_WIDTH_TOTAL_PERCENT,
  MIN_SECTION_WIDTH_PERCENT,
  WIDTH_DISTRIBUTION_PRECISION,
} from '../report-designer.constants';
import { ReportDesignerStateService } from './report-designer-state.service';

@Injectable()
export class ReportDesignerBodyTableService {
  private state = inject(ReportDesignerStateService);

  /**
   * Sum of the column widths of a table, in percent of the table width and in millimetres.
   * A sum above 100 percent means the columns are scaled down in the PDF.
   */
  getColumnWidthSummary(section: ReportSection): { percent: number; mm: number; exceeds: boolean } {
    const percent = section.fields.reduce((sum, field) => sum + (field.width || 0), 0);
    const tableWidthMm = this.state.pageGeometry.usableWidthMm * (this.clampSectionWidth(section.widthPercent) / COLUMN_WIDTH_TOTAL_PERCENT);
    return {
      percent: Math.round(percent),
      mm: Math.round(tableWidthMm),
      exceeds: percent > COLUMN_WIDTH_TOTAL_PERCENT,
    };
  }

  distributeColumnWidths(section: ReportSection): void {
    if (section.fields.length === 0) {
      return;
    }
    const even = COLUMN_WIDTH_TOTAL_PERCENT / section.fields.length;
    for (const field of section.fields) {
      field.width = Math.round(even * WIDTH_DISTRIBUTION_PRECISION) / WIDTH_DISTRIBUTION_PRECISION;
    }
    this.state.emitChange();
  }

  addBodyTable(): void {
    const type = ReportSectionType.WorkTable;
    const footerSection = this.state.footerSection;
    const bodyTables = this.state.bodySections;
    const lastBodySort = bodyTables.length > 0
      ? Math.max(...bodyTables.map(s => s.sortOrder))
      : (this.state.headerSection?.sortOrder ?? 0);

    const newSortOrder = lastBodySort + 1;

    if (footerSection && footerSection.sortOrder <= newSortOrder) {
      footerSection.sortOrder = newSortOrder + 1;
    }

    const newSection: ReportSection = {
      type,
      fields: [],
      visible: true,
      sortOrder: newSortOrder,
    };

    const t = this.state.template();
    t.sections = [...t.sections, newSection];
    this.state.emitChange();
  }

  removeBodyTable(section: ReportSection): void {
    if (this.state.bodySections.length <= 1) return;

    const activeField = this.state.activeField();
    if (activeField && section.fields.includes(activeField)) {
      this.state.activeField.set(null);
    }

    const t = this.state.template();
    t.sections = t.sections.filter(s => s !== section);
    t.sections
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach((s, i) => s.sortOrder = i);
    this.state.emitChange();
  }

  toggleSectionShowFullPeriod(section: ReportSection, value: boolean): void {
    section.showFullPeriod = value;
    this.state.emitChange();
  }

  setSectionTitle(section: ReportSection, value: string): void {
    section.title = value;
    this.state.emitChange();
  }

  setSectionWidthPercent(section: ReportSection, raw: string): void {
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed)) {
      section.widthPercent = undefined;
    } else {
      section.widthPercent = this.clampSectionWidth(parsed);
    }
    this.state.emitChange();
  }

  private clampSectionWidth(value: number | undefined): number {
    if (value === undefined || value === null) return COLUMN_WIDTH_TOTAL_PERCENT;
    return Math.min(COLUMN_WIDTH_TOTAL_PERCENT, Math.max(MIN_SECTION_WIDTH_PERCENT, value));
  }
}
