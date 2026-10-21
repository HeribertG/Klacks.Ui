// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Data source and data set selection of one report row, plus the "use as default for this source" flag.
 * @param source - Data source the user picked
 * @param ds - Data set the user toggled
 */

import { ChangeDetectorRef, Injectable, inject } from '@angular/core';
import { REPORT_DATA_SOURCES, ReportDataSource } from 'src/app/domain/models/report/report-data-source.model';
import { ReportDataSet } from 'src/app/domain/models/report/report-data-set.interface';
import { ReportSectionType } from 'src/app/domain/models/report/report-section-type.enum';
import { ReportDefaultsService } from 'src/app/domain/services/report/report-defaults.service';
import { ReportRowEditorStateService } from './report-row-editor-state.service';

@Injectable()
export class ReportRowSourceService {
  private state = inject(ReportRowEditorStateService);
  private reportDefaults = inject(ReportDefaultsService);
  private cdr = inject(ChangeDetectorRef);

  readonly availableSources = REPORT_DATA_SOURCES;

  get selectedSource(): ReportDataSource | undefined {
    return this.availableSources.find(s => s.id === this.state.editSourceId);
  }

  get selectedSourceDataSets(): ReportDataSet[] {
    return this.selectedSource?.dataSets ?? [];
  }

  selectSource(source: ReportDataSource): void {
    this.state.editSourceId = source.id;
    this.state.editDataSetIds = [source.dataSets[0].id];
    this.state.editIsDefault = this.reportDefaults.getDefaultTemplateId(this.state.editSourceId) === this.state.editTemplate.id;
    this.resetTemplateSections();
  }

  toggleDataSet(ds: ReportDataSet): void {
    if (!this.selectedSource?.multiSelect) {
      this.state.editDataSetIds = [ds.id];
      this.resetTemplateSections();
      return;
    }
    const idx = this.state.editDataSetIds.indexOf(ds.id);
    if (idx >= 0 && this.state.editDataSetIds.length > 1) {
      this.state.editDataSetIds = this.state.editDataSetIds.filter(id => id !== ds.id);
    } else if (idx < 0) {
      this.state.editDataSetIds = [...this.state.editDataSetIds, ds.id];
    }
    this.updateTemplateDataSetIds();
  }

  loadDefaultsState(): void {
    const apply = () => {
      this.state.editIsDefault = !!this.state.editTemplate.id
        && this.reportDefaults.getDefaultTemplateId(this.state.editSourceId) === this.state.editTemplate.id;
      this.cdr.markForCheck();
    };

    if (this.reportDefaults.isLoaded()) {
      apply();
      return;
    }
    this.reportDefaults.load().then(apply).catch(() => undefined);
  }

  async applyDefaultState(): Promise<void> {
    const templateId = this.state.editTemplate.id;
    if (!templateId) {
      return;
    }

    const current = this.reportDefaults.getDefaultTemplateId(this.state.editSourceId);
    if (this.state.editIsDefault && current !== templateId) {
      await this.reportDefaults.setDefault(this.state.editSourceId, templateId);
    } else if (!this.state.editIsDefault && current === templateId) {
      await this.reportDefaults.setDefault(this.state.editSourceId, null);
    }
  }

  private updateTemplateDataSetIds(): void {
    this.state.editTemplate = {
      ...this.state.editTemplate,
      dataSetIds: [...this.state.editDataSetIds],
    };
  }

  private resetTemplateSections(): void {
    this.state.editTemplate = {
      ...this.state.editTemplate,
      sourceId: this.state.editSourceId,
      dataSetIds: [...this.state.editDataSetIds],
      sections: [
        { type: ReportSectionType.Header, fields: [], visible: true, sortOrder: 0 },
        { type: ReportSectionType.WorkTable, fields: [], visible: true, sortOrder: 1 },
        { type: ReportSectionType.Footer, fields: [], visible: true, sortOrder: 2 },
      ]
    };
  }
}
