// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * One drop zone (left, center or right) of a report header row with its field chips: static image,
 * custom text or a plain data field.
 * @param section - The header section the zone belongs to
 * @param rowIndex - Header row of the zone
 * @param alignment - Alignment of the zone and of the fields dropped into it
 * @param fields - Fields of the row that carry this alignment
 */

import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CdkDropList } from '@angular/cdk/drag-drop';

import { ReportSection } from 'src/app/domain/models/report/report-section.model';
import { ReportField, STATIC_IMAGE_DATA_BINDING } from 'src/app/domain/models/report/report-field.model';
import { ReportFieldType } from 'src/app/domain/models/report/report-field-type.enum';
import { TextAlignment } from 'src/app/domain/models/report/text-alignment.enum';
import { CUSTOM_TEXT_DATA_BINDING } from '../report-designer.constants';
import { ReportDesignerStateService } from '../services/report-designer-state.service';
import { ReportDesignerHeaderService } from '../services/report-designer-header.service';
import { ReportDesignerDropZoneService } from '../services/report-designer-drop-zone.service';

@Component({
  selector: 'app-report-designer-header-zone',
  templateUrl: './report-designer-header-zone.component.html',
  styleUrls: ['./report-designer-header-zone.component.scss'],
  standalone: true,
  imports: [TranslateModule, CdkDropList],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportDesignerHeaderZoneComponent {
  readonly section = input.required<ReportSection>();
  readonly rowIndex = input.required<number>();
  readonly alignment = input.required<TextAlignment>();
  readonly fields = input.required<ReportField[]>();

  protected readonly state = inject(ReportDesignerStateService);
  protected readonly header = inject(ReportDesignerHeaderService);
  protected readonly dropZones = inject(ReportDesignerDropZoneService);

  protected readonly ReportFieldType = ReportFieldType;
  protected readonly staticImageBinding = STATIC_IMAGE_DATA_BINDING;
  protected readonly customTextBinding = CUSTOM_TEXT_DATA_BINDING;
}
