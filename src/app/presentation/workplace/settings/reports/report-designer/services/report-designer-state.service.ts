// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Shared state of one report designer: the bound component inputs, the active field, the style-conditions
 * toggle and the read access to the sections of the edited template.
 * @param inputs - Signals of the designer component (template, source, data sets, image cache, parameter keys)
 */

import { Injectable, signal } from '@angular/core';

import { ReportTemplate, resolvePageGeometry } from 'src/app/domain/models/report/report-template.model';
import { PageGeometry } from 'src/app/domain/models/report/page-geometry.interface';
import { ReportSection } from 'src/app/domain/models/report/report-section.model';
import { ReportSectionType } from 'src/app/domain/models/report/report-section-type.enum';
import { ReportField } from 'src/app/domain/models/report/report-field.model';
import { ReportDataSet } from 'src/app/domain/models/report/report-data-set.interface';
import { REPORT_DATA_SOURCES } from 'src/app/domain/models/report/report-data-source.model';
import { ReportDesignerInputs } from '../report-designer-inputs.interface';
import { REPORT_DESIGNER_UNBOUND_ERROR } from '../report-designer.constants';

@Injectable()
export class ReportDesignerStateService {
  readonly activeField = signal<ReportField | null>(null);
  readonly showStyleConditions = signal(false);

  private inputs?: ReportDesignerInputs;

  bind(inputs: ReportDesignerInputs): void {
    this.inputs = inputs;
  }

  template(): ReportTemplate {
    return this.bound.template();
  }

  sourceId(): string {
    return this.bound.sourceId();
  }

  dataSetIds(): string[] {
    return this.bound.dataSetIds();
  }

  imagePreviewCache(): Map<string, string> {
    return this.bound.imagePreviewCache();
  }

  parameterKeys(): string[] {
    return this.bound.parameterKeys();
  }

  emitChange(): void {
    const template = this.bound.template;
    template.set({ ...template() });
  }

  selectField(field: ReportField): void {
    this.activeField.set(field);
  }

  clearActiveField(field: ReportField): void {
    if (this.activeField() === field) this.activeField.set(null);
  }

  toggleStyleConditions(): void {
    this.showStyleConditions.set(!this.showStyleConditions());
  }

  get pageGeometry(): PageGeometry {
    return resolvePageGeometry(this.template().pageSetup);
  }

  get activeDataSets(): ReportDataSet[] {
    const source = REPORT_DATA_SOURCES.find(s => s.id === this.sourceId());
    return source?.dataSets.filter(ds => this.dataSetIds().includes(ds.id)) ?? [];
  }

  get bodySections(): ReportSection[] {
    return this.template().sections
      .filter(s => s.type !== ReportSectionType.Header && s.type !== ReportSectionType.Footer)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  get headerSection(): ReportSection | undefined {
    return this.template().sections.find(s => s.type === ReportSectionType.Header);
  }

  get footerSection(): ReportSection | undefined {
    return this.template().sections.find(s => s.type === ReportSectionType.Footer);
  }

  getSection(type: ReportSectionType): ReportSection | undefined {
    return this.template().sections.find(s => s.type === type);
  }

  isHeaderField(field: ReportField): boolean {
    const headerSection = this.getSection(ReportSectionType.Header);
    return headerSection?.fields.includes(field) ?? false;
  }

  isTableFooterField(field: ReportField): boolean {
    return this.bodySections.some(s => s.tableFooterFields?.includes(field));
  }

  isBodyTableField(field: ReportField): boolean {
    return this.bodySections.some(s => s.fields.includes(field));
  }

  isSectionShowFullPeriod(section: ReportSection): boolean {
    return section.showFullPeriod ?? this.template().showFullPeriod ?? false;
  }

  private get bound(): ReportDesignerInputs {
    if (!this.inputs) throw new Error(REPORT_DESIGNER_UNBOUND_ERROR);
    return this.inputs;
  }
}
