// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Header section of the report designer: one row per header line with a left, center and right drop zone,
 * an image upload and a remove button per row. Reads the header section from the designer state so it
 * re-renders on every template change.
 */

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { ReportSectionType } from 'src/app/domain/models/report/report-section-type.enum';
import { TextAlignment } from 'src/app/domain/models/report/text-alignment.enum';
import { SECTION_LABELS } from '../report-designer.constants';
import { ReportDesignerHeaderZoneComponent } from '../report-designer-header-zone/report-designer-header-zone.component';
import { ReportDesignerStateService } from '../services/report-designer-state.service';
import { ReportDesignerFieldService } from '../services/report-designer-field.service';
import { ReportDesignerHeaderService } from '../services/report-designer-header.service';

@Component({
  selector: 'app-report-designer-header',
  templateUrl: './report-designer-header.component.html',
  styleUrls: ['./report-designer-header.component.scss'],
  standalone: true,
  imports: [TranslateModule, ReportDesignerHeaderZoneComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportDesignerHeaderComponent {
  protected readonly state = inject(ReportDesignerStateService);
  protected readonly fieldService = inject(ReportDesignerFieldService);
  protected readonly header = inject(ReportDesignerHeaderService);

  protected readonly TextAlignment = TextAlignment;
  protected readonly ReportSectionType = ReportSectionType;
  protected readonly sectionLabels = SECTION_LABELS;
}
