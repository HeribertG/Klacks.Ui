// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Field palette of the report designer: lists the header, table and footer fields of the active data sets
 * as drag sources for the drop zones of the report preview.
 */

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';

import { ReportDesignerPaletteService } from '../services/report-designer-palette.service';
import { ReportDesignerDropZoneService } from '../services/report-designer-drop-zone.service';

@Component({
  selector: 'app-report-designer-palette',
  templateUrl: './report-designer-palette.component.html',
  styleUrls: ['./report-designer-palette.component.scss'],
  standalone: true,
  imports: [TranslateModule, CdkDrag, CdkDropList],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportDesignerPaletteComponent {
  protected readonly palette = inject(ReportDesignerPaletteService);
  protected readonly dropZones = inject(ReportDesignerDropZoneService);
}
