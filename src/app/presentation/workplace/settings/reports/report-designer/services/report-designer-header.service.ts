// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Commands of the report header section: dropping fields into a header zone, removing fields and rows,
 * uploading images, reading their previews and deciding when a header zone shows its drop placeholder.
 * @param section - The header section of the edited template
 * @param rowIndex - Header row the command applies to
 * @param alignment - Header zone (left, center, right) the command applies to
 */

import { Injectable, inject } from '@angular/core';
import { CdkDragDrop } from '@angular/cdk/drag-drop';

import { ReportSection } from 'src/app/domain/models/report/report-section.model';
import { ReportField } from 'src/app/domain/models/report/report-field.model';
import { TextAlignment } from 'src/app/domain/models/report/text-alignment.enum';
import { ReportDesignerFieldService } from './report-designer-field.service';
import { ReportDesignerImageService } from './report-designer-image.service';
import { ReportDesignerPaletteService } from './report-designer-palette.service';
import { ReportDesignerStateService } from './report-designer-state.service';

@Injectable()
export class ReportDesignerHeaderService {
  private state = inject(ReportDesignerStateService);
  private fieldService = inject(ReportDesignerFieldService);
  private imageService = inject(ReportDesignerImageService);
  private palette = inject(ReportDesignerPaletteService);

  getImagePreview(fileName: string): string | undefined {
    return this.imageService.getImagePreview(fileName, this.state.imagePreviewCache());
  }

  isZonePlaceholderVisible(fields: ReportField[], alignment: TextAlignment): boolean {
    if (fields.length === 0) return true;
    return alignment === TextAlignment.Left && fields.length === 1 && !fields[0].dataBinding;
  }

  removeHeaderRow(section: ReportSection, rowIndex: number): void {
    this.state.activeField.set(this.fieldService.removeHeaderRow(section, rowIndex, this.state.activeField()));
    this.state.emitChange();
  }

  onHeaderFieldDrop(event: CdkDragDrop<ReportField[]>, section: ReportSection, rowIndex: number, alignment: TextAlignment): void {
    const field = this.fieldService.onHeaderFieldDrop(event, section, rowIndex, alignment, b => this.palette.getFieldDisplayLabel(b));
    if (field) this.state.selectField(field);
    this.state.emitChange();
  }

  removeHeaderField(section: ReportSection, field: ReportField): void {
    this.fieldService.removeHeaderField(section, field, this.state.imagePreviewCache());
    this.state.clearActiveField(field);
    this.state.emitChange();
  }

  async onImageChipUpload(event: Event, field: ReportField): Promise<void> {
    const success = await this.imageService.onImageChipUpload(event, field, this.state.imagePreviewCache());
    if (success) {
      this.state.selectField(field);
      this.state.emitChange();
    }
  }

  async onImageUpload(event: Event, section: ReportSection, rowIndex: number, alignment: TextAlignment): Promise<void> {
    const field = await this.imageService.onImageUpload(event, section, rowIndex, alignment, this.state.imagePreviewCache());
    if (field) {
      this.state.selectField(field);
      this.state.emitChange();
    }
  }
}
