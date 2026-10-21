// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Columns of the body tables and chips of the page footer: dropping and re-ordering fields, removing
 * them, clamping a column width and adding a formula column.
 * @param event - CDK drop event of a body table or the page footer
 * @param section - Section the field belongs to
 * @param field - Field the command applies to
 */

import { Injectable, inject } from '@angular/core';
import { CdkDragDrop } from '@angular/cdk/drag-drop';

import { ReportSection } from 'src/app/domain/models/report/report-section.model';
import { ReportField } from 'src/app/domain/models/report/report-field.model';
import { MAX_COLUMN_WIDTH_PERCENT, MIN_COLUMN_WIDTH_PERCENT } from '../report-designer.constants';
import { ReportDesignerFieldService } from './report-designer-field.service';
import { ReportDesignerPaletteService } from './report-designer-palette.service';
import { ReportDesignerStateService } from './report-designer-state.service';

@Injectable()
export class ReportDesignerSectionFieldsService {
  private state = inject(ReportDesignerStateService);
  private fieldService = inject(ReportDesignerFieldService);
  private palette = inject(ReportDesignerPaletteService);

  onBodyTableFieldDrop(event: CdkDragDrop<ReportField[]>, section: ReportSection): void {
    this.fieldService.onBodyTableFieldDrop(event, section, b => this.palette.getFieldDisplayLabel(b));
    this.state.emitChange();
  }

  onFooterFieldDrop(event: CdkDragDrop<ReportField[]>): void {
    this.fieldService.onFooterFieldDrop(event, this.state.footerSection, b => this.palette.getFieldDisplayLabel(b));
    this.state.emitChange();
  }

  removeFieldFromSection(field: ReportField, section: ReportSection): void {
    this.fieldService.removeFieldFromSection(field, section);
    this.state.clearActiveField(field);
    this.state.emitChange();
  }

  onWidthChange(field: ReportField): void {
    if (field.width < MIN_COLUMN_WIDTH_PERCENT) field.width = MIN_COLUMN_WIDTH_PERCENT;
    if (field.width > MAX_COLUMN_WIDTH_PERCENT) field.width = MAX_COLUMN_WIDTH_PERCENT;
    this.state.emitChange();
  }

  addFormulaField(section: ReportSection): void {
    this.state.activeField.set(this.fieldService.addFormulaField(section));
    this.state.emitChange();
  }
}
