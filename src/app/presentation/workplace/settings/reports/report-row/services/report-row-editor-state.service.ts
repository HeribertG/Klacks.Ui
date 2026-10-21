// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Edit state of one report row's modal: the form fields, the template under edit, the page setup
 * and the snapshot that tells whether there is unsaved work.
 * @param source - Report template input of the row, bound once by the component
 */

import { Injectable, Signal } from '@angular/core';
import { ReportTemplate, DEFAULT_PAGE_SETUP } from 'src/app/domain/models/report/report-template.model';
import { ReportType } from 'src/app/domain/models/report/report-type.enum';
import { ReportOrientation } from 'src/app/domain/models/report/report-orientation.enum';
import { ReportPageSize } from 'src/app/domain/models/report/report-page-size.enum';
import { ReportMargins } from 'src/app/domain/models/report/report-margins.interface';
import { ReportPageSetup } from 'src/app/domain/models/report/report-page-setup.interface';
import { ReportParameter } from 'src/app/domain/models/report/report-parameter.model';
import { ReportParameterValues } from 'src/app/domain/models/report/report-parameter-values.type';
import { DEFAULT_SECTIONS } from 'src/app/domain/models/report/report-section.model';
import { buildDefaultParameterValues } from 'src/app/domain/helpers/report-parameter.helper';
import { DEFAULT_DATA_SET_ID, DEFAULT_SOURCE_ID, MARGIN_MAX, MARGIN_MIN, MARGIN_SIDES } from '../report-row.constants';

@Injectable()
export class ReportRowEditorStateService {
  readonly marginSides = MARGIN_SIDES;

  editName = '';
  editDescription = '';
  editOrientation: ReportOrientation = ReportOrientation.Landscape;
  editPageSize: ReportPageSize = ReportPageSize.A4;
  editMargins: ReportMargins = { ...DEFAULT_PAGE_SETUP.margins };
  editIsDefault = false;
  editParameters: ReportParameter[] = [];
  parameterValues: ReportParameterValues = {};
  editSourceId = DEFAULT_SOURCE_ID;
  editDataSetIds: string[] = [DEFAULT_DATA_SET_ID];
  editTemplate: ReportTemplate = {
    name: '',
    description: '',
    type: ReportType.Schedule,
    pageSetup: { ...DEFAULT_PAGE_SETUP },
    sections: [...DEFAULT_SECTIONS]
  };
  imageCache = new Map<string, string>();

  private source: Signal<ReportTemplate> | null = null;
  private savedSnapshot = '';

  bindSource(source: Signal<ReportTemplate>): void {
    this.source = source;
  }

  get isNew(): boolean {
    if (this.editTemplate?.id) return false;
    return !!this.source?.().isLocal;
  }

  get isNameValid(): boolean {
    return this.editName.trim().length > 0;
  }

  get hasUnsavedChanges(): boolean {
    return this.buildSnapshot() !== this.savedSnapshot;
  }

  markSaved(): void {
    this.savedSnapshot = this.buildSnapshot();
  }

  load(template: ReportTemplate): void {
    this.editName = template.name;
    this.editDescription = template.description;
    this.editOrientation = template.pageSetup?.orientation ?? ReportOrientation.Landscape;
    this.editPageSize = template.pageSetup?.size ?? ReportPageSize.A4;
    this.editMargins = { ...(template.pageSetup?.margins ?? DEFAULT_PAGE_SETUP.margins) };
    this.editParameters = structuredClone(template.parameters ?? []);
    this.parameterValues = buildDefaultParameterValues(this.editParameters);
    this.editSourceId = template.sourceId || DEFAULT_SOURCE_ID;
    this.editDataSetIds = template.dataSetIds?.length ? [...template.dataSetIds] : [DEFAULT_DATA_SET_ID];
    this.editTemplate = {
      ...template,
      sourceId: this.editSourceId,
      dataSetIds: this.editDataSetIds,
      pageSetup: template.pageSetup || { ...DEFAULT_PAGE_SETUP },
      sections: template.sections?.length ? template.sections : [...DEFAULT_SECTIONS]
    };
  }

  onPageSetupChange(): void {
    this.editTemplate = {
      ...this.editTemplate,
      pageSetup: this.buildPageSetup()
    };
  }

  onMarginChange(side: keyof ReportMargins, raw: number | string): void {
    const parsed = typeof raw === 'number' ? raw : parseInt(raw, 10);
    const value = Number.isNaN(parsed) ? DEFAULT_PAGE_SETUP.margins[side] : parsed;
    this.editMargins = {
      ...this.editMargins,
      [side]: Math.min(MARGIN_MAX, Math.max(MARGIN_MIN, value)),
    };
    this.onPageSetupChange();
  }

  buildPageSetup(): ReportPageSetup {
    return {
      ...this.editTemplate.pageSetup,
      orientation: this.editOrientation,
      size: this.editPageSize,
      margins: { ...this.editMargins },
    };
  }

  buildPreviewTemplate(): ReportTemplate {
    return {
      ...this.editTemplate,
      name: this.editName.trim(),
      sourceId: this.editSourceId,
      dataSetIds: [...this.editDataSetIds],
      mergeRows: this.editTemplate.mergeRows,
      showFullPeriod: this.editTemplate.showFullPeriod,
      pageSetup: this.buildPageSetup(),
      parameters: [...this.editParameters],
    };
  }

  private buildSnapshot(): string {
    return JSON.stringify({
      name: this.editName,
      description: this.editDescription,
      orientation: this.editOrientation,
      pageSize: this.editPageSize,
      margins: this.editMargins,
      sourceId: this.editSourceId,
      dataSetIds: this.editDataSetIds,
      isDefault: this.editIsDefault,
      mergeRows: this.editTemplate.mergeRows ?? false,
      showFullPeriod: this.editTemplate.showFullPeriod ?? false,
      sections: this.editTemplate.sections,
      parameters: this.editParameters,
    });
  }
}
