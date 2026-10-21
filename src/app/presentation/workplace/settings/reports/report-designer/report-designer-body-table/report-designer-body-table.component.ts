// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * One body table of the report designer: table options (title, width, full period, row filter, grouping),
 * the column drop zone, the table footer row and the free text rows.
 * @param section - The body table section
 * @param index - Position of the table among the body tables, shown as table number
 */

import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';

import { ReportSection } from 'src/app/domain/models/report/report-section.model';
import { ReportFieldType } from 'src/app/domain/models/report/report-field-type.enum';
import { SCHEDULE_SOURCE_ID } from '../report-designer.constants';
import { ReportDesignerStateService } from '../services/report-designer-state.service';
import { ReportDesignerFieldService } from '../services/report-designer-field.service';
import { ReportDesignerBodyTableService } from '../services/report-designer-body-table.service';
import { ReportDesignerSectionFieldsService } from '../services/report-designer-section-fields.service';
import { ReportDesignerTableRulesService } from '../services/report-designer-table-rules.service';
import { ReportDesignerTableFooterService } from '../services/report-designer-table-footer.service';
import { ReportDesignerMergeService } from '../services/report-designer-merge.service';
import { ReportDesignerDropZoneService } from '../services/report-designer-drop-zone.service';

@Component({
  selector: 'app-report-designer-body-table',
  templateUrl: './report-designer-body-table.component.html',
  styleUrls: ['./report-designer-body-table.component.scss'],
  standalone: true,
  imports: [TranslateModule, FormsModule, CdkDrag, CdkDropList],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportDesignerBodyTableComponent {
  readonly section = input.required<ReportSection>();
  readonly index = input.required<number>();

  protected readonly state = inject(ReportDesignerStateService);
  protected readonly fieldService = inject(ReportDesignerFieldService);
  protected readonly bodyTables = inject(ReportDesignerBodyTableService);
  protected readonly sectionFields = inject(ReportDesignerSectionFieldsService);
  protected readonly rules = inject(ReportDesignerTableRulesService);
  protected readonly tableFooter = inject(ReportDesignerTableFooterService);
  protected readonly merge = inject(ReportDesignerMergeService);
  protected readonly dropZones = inject(ReportDesignerDropZoneService);

  protected readonly ReportFieldType = ReportFieldType;
  protected readonly scheduleSourceId = SCHEDULE_SOURCE_ID;
}
