// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Visual report designer component for configuring report templates with sections, fields, and styling.
 * Hosts the component-scoped designer services and composes palette, toolbar, header, body tables,
 * page footer and formula editor.
 * @param template - The report template being edited
 * @param sourceId - Active data source identifier (e.g. 'schedule')
 * @param dataSetIds - Active data set identifiers (e.g. ['work'])
 * @param imagePreviewCache - Shared cache for image preview DataURLs
 * @param parameterKeys - Keys of the template parameters, used to validate row filters
 */

import { Component, ChangeDetectionStrategy, inject, effect, input, model } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { ReportTemplate } from 'src/app/domain/models/report/report-template.model';
import { DEFAULT_DATA_SET_IDS, SCHEDULE_SOURCE_ID } from './report-designer.constants';
import { ReportDesignerPaletteComponent } from './report-designer-palette/report-designer-palette.component';
import { ReportDesignerToolbarComponent } from './report-designer-toolbar/report-designer-toolbar.component';
import { ReportDesignerHeaderComponent } from './report-designer-header/report-designer-header.component';
import { ReportDesignerBodyTableComponent } from './report-designer-body-table/report-designer-body-table.component';
import { ReportDesignerPageFooterComponent } from './report-designer-page-footer/report-designer-page-footer.component';
import { ReportDesignerFormulaEditorComponent } from './report-designer-formula-editor/report-designer-formula-editor.component';
import { ReportDesignerStateService } from './services/report-designer-state.service';
import { ReportDesignerFieldService } from './services/report-designer-field.service';
import { ReportDesignerBorderService } from './services/report-designer-border.service';
import { ReportDesignerFormulaService } from './services/report-designer-formula.service';
import { ReportDesignerImageService } from './services/report-designer-image.service';
import { ReportDesignerPaletteService } from './services/report-designer-palette.service';
import { ReportDesignerDropZoneService } from './services/report-designer-drop-zone.service';
import { ReportDesignerHeaderService } from './services/report-designer-header.service';
import { ReportDesignerBodyTableService } from './services/report-designer-body-table.service';
import { ReportDesignerSectionFieldsService } from './services/report-designer-section-fields.service';
import { ReportDesignerTableRulesService } from './services/report-designer-table-rules.service';
import { ReportDesignerTableFooterService } from './services/report-designer-table-footer.service';
import { ReportDesignerMergeService } from './services/report-designer-merge.service';

@Component({
  selector: 'app-report-designer',
  templateUrl: './report-designer.component.html',
  styleUrls: ['./report-designer.component.scss'],
  standalone: true,
  imports: [
    TranslateModule,
    ReportDesignerPaletteComponent,
    ReportDesignerToolbarComponent,
    ReportDesignerHeaderComponent,
    ReportDesignerBodyTableComponent,
    ReportDesignerPageFooterComponent,
    ReportDesignerFormulaEditorComponent,
  ],
  providers: [
    ReportDesignerStateService,
    ReportDesignerFieldService,
    ReportDesignerBorderService,
    ReportDesignerFormulaService,
    ReportDesignerImageService,
    ReportDesignerPaletteService,
    ReportDesignerDropZoneService,
    ReportDesignerHeaderService,
    ReportDesignerBodyTableService,
    ReportDesignerSectionFieldsService,
    ReportDesignerTableRulesService,
    ReportDesignerTableFooterService,
    ReportDesignerMergeService,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportDesignerComponent {
  readonly template = model.required<ReportTemplate>();
  readonly sourceId = input(SCHEDULE_SOURCE_ID);
  readonly dataSetIds = input<string[]>([...DEFAULT_DATA_SET_IDS]);
  readonly imagePreviewCache = input(new Map<string, string>());
  readonly parameterKeys = input<string[]>([]);

  protected readonly state = inject(ReportDesignerStateService);
  protected readonly formulaSvc = inject(ReportDesignerFormulaService);
  protected readonly bodyTables = inject(ReportDesignerBodyTableService);
  private readonly imageService = inject(ReportDesignerImageService);

  protected readonly scheduleSourceId = SCHEDULE_SOURCE_ID;

  constructor() {
    this.state.bind({
      template: this.template,
      sourceId: this.sourceId,
      dataSetIds: this.dataSetIds,
      imagePreviewCache: this.imagePreviewCache,
      parameterKeys: this.parameterKeys,
    });

    effect(() => {
      const t = this.template();
      if (t?.sections) {
        for (const section of t.sections) {
          this.imageService.loadExistingImages(section, this.imagePreviewCache());
        }
      }
    });
  }
}
