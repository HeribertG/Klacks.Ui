// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Footer row of a body table: switching it on and off, adding and removing sum and formula fields and
 * choosing the column a formula footer field is printed under.
 * @param section - Body table whose footer row is edited
 * @param field - Footer field the command applies to
 */

import { Injectable, inject } from '@angular/core';

import { ReportSection } from 'src/app/domain/models/report/report-section.model';
import { ReportField } from 'src/app/domain/models/report/report-field.model';
import { DataBindingDefinition } from 'src/app/domain/models/report/data-binding-definition.interface';
import { PAGE_LAYOUT_FIELD_KEYS } from 'src/app/domain/models/report/report-data-source.model';
import { ReportDesignerFieldService } from './report-designer-field.service';
import { ReportDesignerPaletteService } from './report-designer-palette.service';
import { ReportDesignerStateService } from './report-designer-state.service';

@Injectable()
export class ReportDesignerTableFooterService {
  private state = inject(ReportDesignerStateService);
  private fieldService = inject(ReportDesignerFieldService);
  private palette = inject(ReportDesignerPaletteService);

  toggleTableFooter(section: ReportSection): void {
    if (section.tableFooterFields !== undefined) {
      section.tableFooterFields = undefined;
    } else {
      section.tableFooterFields = [];
    }
    this.state.emitChange();
  }

  getAvailableFooterFields(): DataBindingDefinition[] {
    return this.state.activeDataSets
      .flatMap(ds => ds.footerFields)
      .filter(field => !PAGE_LAYOUT_FIELD_KEYS.includes(field.key));
  }

  addTableFooterField(section: ReportSection, binding: DataBindingDefinition): void {
    this.fieldService.addTableFooterField(section, binding, b => this.palette.getFieldDisplayLabel(b));
    this.state.emitChange();
  }

  removeTableFooterField(section: ReportSection, field: ReportField): void {
    this.fieldService.removeTableFooterField(section, field);
    this.state.clearActiveField(field);
    this.state.emitChange();
  }

  addTableFooterFieldByKey(section: ReportSection, key: string): void {
    if (!key) return;
    const binding = this.getAvailableFooterFields().find(f => f.key === key);
    if (binding) this.addTableFooterField(section, binding);
  }

  getFooterFieldNotYetAdded(section: ReportSection): DataBindingDefinition[] {
    const all = this.getAvailableFooterFields();
    const used = section.tableFooterFields ?? [];
    return all.filter(f => !used.some(u => u.dataBinding === f.key));
  }

  getFormulaFooterColumnOptions(field: ReportField): { index: number; label: string }[] {
    const section = this.state.bodySections.find(s => s.tableFooterFields?.includes(field));
    if (!section) return [];
    return [...section.fields]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((f, i) => ({ index: i, label: f.name || f.dataBinding }));
  }

  setFormulaFooterColumn(field: ReportField, colIndex: number): void {
    field.sortOrder = colIndex;
    this.state.emitChange();
  }

  addFormulaFooterField(section: ReportSection): void {
    this.state.activeField.set(this.fieldService.addFormulaFooterField(section));
    this.state.emitChange();
  }
}
