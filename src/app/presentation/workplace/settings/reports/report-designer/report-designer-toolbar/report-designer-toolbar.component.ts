// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Toolbar of the active report field: font, color, alignment, borders, image size, merged bindings,
 * formula editing and the conditional formatting panel of a table column.
 * @param field - The active field the toolbar edits
 */

import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { ReportField, AVAILABLE_FONTS } from 'src/app/domain/models/report/report-field.model';
import { ReportFieldType } from 'src/app/domain/models/report/report-field-type.enum';
import { TextAlignment } from 'src/app/domain/models/report/text-alignment.enum';
import { BorderLineStyle } from 'src/app/domain/models/report/border-line-style.enum';
import { StyleConditionsComponent } from '../style-conditions/style-conditions.component';
import {
  BORDER_LINE_STYLE_OPTIONS,
  MAX_FONT_SIZE,
  MAX_IMAGE_SIZE,
  MIN_FONT_SIZE,
  MIN_IMAGE_SIZE,
  SEPARATOR_OPTIONS,
} from '../report-designer.constants';
import { ReportDesignerStateService } from '../services/report-designer-state.service';
import { ReportDesignerBorderService } from '../services/report-designer-border.service';
import { ReportDesignerFormulaService } from '../services/report-designer-formula.service';
import { ReportDesignerMergeService } from '../services/report-designer-merge.service';
import { ReportDesignerTableFooterService } from '../services/report-designer-table-footer.service';

@Component({
  selector: 'app-report-designer-toolbar',
  templateUrl: './report-designer-toolbar.component.html',
  styleUrls: ['./report-designer-toolbar.component.scss'],
  standalone: true,
  imports: [TranslateModule, FormsModule, StyleConditionsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportDesignerToolbarComponent {
  readonly field = input.required<ReportField>();

  protected readonly state = inject(ReportDesignerStateService);
  protected readonly borderService = inject(ReportDesignerBorderService);
  protected readonly formulaSvc = inject(ReportDesignerFormulaService);
  protected readonly merge = inject(ReportDesignerMergeService);
  protected readonly tableFooter = inject(ReportDesignerTableFooterService);

  protected readonly TextAlignment = TextAlignment;
  protected readonly ReportFieldType = ReportFieldType;
  protected readonly BorderLineStyle = BorderLineStyle;
  protected readonly availableFonts = AVAILABLE_FONTS;
  protected readonly separatorOptions = SEPARATOR_OPTIONS;
  protected readonly borderLineStyles = BORDER_LINE_STYLE_OPTIONS;

  setFontSize(field: ReportField, size: number): void {
    if (size < MIN_FONT_SIZE) size = MIN_FONT_SIZE;
    if (size > MAX_FONT_SIZE) size = MAX_FONT_SIZE;
    field.style.fontSize = size;
    this.state.emitChange();
  }

  setImageWidth(field: ReportField, width: number): void {
    field.width = this.clampImageSize(width);
    this.state.emitChange();
  }

  setImageHeight(field: ReportField, height: number): void {
    field.height = this.clampImageSize(height);
    this.state.emitChange();
  }

  openFormulaEditor(field: ReportField): void {
    this.formulaSvc.openFormulaEditor(field, this.state.bodySections, this.state.sourceId(), this.state.dataSetIds());
  }

  private clampImageSize(size: number): number {
    if (size < MIN_IMAGE_SIZE) return MIN_IMAGE_SIZE;
    if (size > MAX_IMAGE_SIZE) return MAX_IMAGE_SIZE;
    return size;
  }
}
