// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Page footer section of the report designer: drop zone and re-orderable chips of the footer fields.
 * Reads the footer section from the designer state so it re-renders on every template change.
 */

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';

import { ReportSectionType } from 'src/app/domain/models/report/report-section-type.enum';
import { SECTION_LABELS } from '../report-designer.constants';
import { ReportDesignerStateService } from '../services/report-designer-state.service';
import { ReportDesignerSectionFieldsService } from '../services/report-designer-section-fields.service';
import { ReportDesignerDropZoneService } from '../services/report-designer-drop-zone.service';

@Component({
  selector: 'app-report-designer-page-footer',
  templateUrl: './report-designer-page-footer.component.html',
  styleUrls: ['./report-designer-page-footer.component.scss'],
  standalone: true,
  imports: [TranslateModule, CdkDrag, CdkDropList],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportDesignerPageFooterComponent {
  protected readonly state = inject(ReportDesignerStateService);
  protected readonly sectionFields = inject(ReportDesignerSectionFieldsService);
  protected readonly dropZones = inject(ReportDesignerDropZoneService);

  protected readonly ReportSectionType = ReportSectionType;
  protected readonly sectionLabels = SECTION_LABELS;
}
