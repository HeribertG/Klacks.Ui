// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Service for field CRUD operations across all report section types (header, body, footer).
 * @param translate - TranslateService for resolving i18n field labels
 * @param http - HttpClient for image deletion on header field removal
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { environment } from 'src/environments/environment';

import { ReportSection } from 'src/app/domain/models/report/report-section.model';
import {
  ReportField,
  ReportFieldType,
  DataBindingDefinition,
  DEFAULT_FIELD_STYLE,
  TextAlignment,
  HeaderRow,
} from 'src/app/domain/models/report/report-field.model';
import { FreeTextRow } from 'src/app/domain/models/report/free-text-row.model';
import { FOOTER_TO_COLUMN_MAP } from 'src/app/domain/models/report/report-footer-mapping.constants';

@Injectable()
export class ReportDesignerFieldService {
  private translate = inject(TranslateService);
  private http = inject(HttpClient);

  isFieldInSection(binding: DataBindingDefinition, section: ReportSection | undefined): boolean {
    if (!section) return false;
    if (binding.type === ReportFieldType.Image) return false;
    if (binding.key === 'report.customText') return false;
    return section.fields.some(f => f.dataBinding === binding.key);
  }

  isFieldInSectionInstance(binding: DataBindingDefinition, section: ReportSection): boolean {
    if (binding.type === ReportFieldType.Image) return false;
    if (binding.key === 'report.customText') return false;
    return section.fields.some(f => f.dataBinding === binding.key);
  }

  addFieldToSection(
    binding: DataBindingDefinition,
    section: ReportSection | undefined,
    getFieldDisplayLabel: (b: DataBindingDefinition) => string,
  ): void {
    if (!section || this.isFieldInSection(binding, section)) return;

    const field: ReportField = {
      name: getFieldDisplayLabel(binding),
      dataBinding: binding.key,
      type: binding.type,
      width: binding.defaultWidth,
      height: 20,
      style: { ...DEFAULT_FIELD_STYLE },
      sortOrder: section.fields.length,
    };

    section.fields = [...section.fields, field];
  }

  removeFieldFromSection(field: ReportField, section: ReportSection): ReportField | null {
    section.fields = section.fields.filter(f => f !== field);
    section.fields.forEach((f, i) => f.sortOrder = i);
    return field;
  }

  onFooterFieldDrop(
    event: CdkDragDrop<ReportField[]>,
    footerSection: ReportSection | undefined,
    getFieldDisplayLabel: (b: DataBindingDefinition) => string,
  ): void {
    if (!footerSection) return;

    if (event.previousContainer === event.container) {
      moveItemInArray(footerSection.fields, event.previousIndex, event.currentIndex);
      footerSection.fields.forEach((f, i) => f.sortOrder = i);
    } else {
      const binding = event.item.data as DataBindingDefinition;
      if (binding && !this.isFieldInSection(binding, footerSection)) {
        this.addFieldToSection(binding, footerSection, getFieldDisplayLabel);
      }
    }
  }

  addFieldToBodyTable(
    binding: DataBindingDefinition,
    section: ReportSection,
    getFieldDisplayLabel: (b: DataBindingDefinition) => string,
  ): void {
    if (this.isFieldInSectionInstance(binding, section)) return;

    const field: ReportField = {
      name: getFieldDisplayLabel(binding),
      dataBinding: binding.key,
      type: binding.type,
      width: binding.defaultWidth,
      height: 20,
      style: { ...DEFAULT_FIELD_STYLE },
      sortOrder: section.fields.length,
    };

    section.fields = [...section.fields, field];
  }

  onBodyTableFieldDrop(
    event: CdkDragDrop<ReportField[]>,
    section: ReportSection,
    getFieldDisplayLabel: (b: DataBindingDefinition) => string,
  ): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(section.fields, event.previousIndex, event.currentIndex);
      section.fields.forEach((f, i) => f.sortOrder = i);
    } else {
      const binding = event.item.data as DataBindingDefinition;
      if (binding && !this.isFieldInSectionInstance(binding, section)) {
        this.addFieldToBodyTable(binding, section, getFieldDisplayLabel);
      }
    }
  }

  getHeaderRows(section: ReportSection): HeaderRow[] {
    const rowMap = new Map<number, HeaderRow>();

    for (const field of section.fields) {
      const rowIndex = field.sortOrder;
      if (!rowMap.has(rowIndex)) {
        rowMap.set(rowIndex, { rowIndex, left: [], center: [], right: [] });
      }
      const row = rowMap.get(rowIndex)!;
      switch (field.style?.alignment) {
        case TextAlignment.Center: row.center.push(field); break;
        case TextAlignment.Right: row.right.push(field); break;
        default: row.left.push(field); break;
      }
    }

    return Array.from(rowMap.values()).sort((a, b) => a.rowIndex - b.rowIndex);
  }

  addHeaderRow(section: ReportSection): void {
    const rows = this.getHeaderRows(section);
    const nextIndex = rows.length > 0 ? Math.max(...rows.map(r => r.rowIndex)) + 1 : 0;
    section.fields = [...section.fields, {
      name: '',
      dataBinding: '',
      type: ReportFieldType.Text,
      width: 30,
      height: 20,
      style: { ...DEFAULT_FIELD_STYLE, alignment: TextAlignment.Left },
      sortOrder: nextIndex,
    }];
  }

  removeHeaderRow(section: ReportSection, rowIndex: number, activeField: ReportField | null): ReportField | null {
    const removedFields = section.fields.filter(f => f.sortOrder === rowIndex);
    let newActiveField = activeField;
    if (removedFields.includes(activeField!)) newActiveField = null;

    section.fields = section.fields.filter(f => f.sortOrder !== rowIndex);
    const rows = this.getHeaderRows(section);
    rows.forEach((row, i) => {
      [...row.left, ...row.center, ...row.right].forEach(f => f.sortOrder = i);
    });

    return newActiveField;
  }

  onHeaderFieldDrop(
    event: CdkDragDrop<ReportField[]>,
    section: ReportSection,
    rowIndex: number,
    alignment: TextAlignment,
    getFieldDisplayLabel: (b: DataBindingDefinition) => string,
  ): ReportField | null {
    if (event.previousContainer === event.container) {
      return null;
    }

    const binding = event.item.data as DataBindingDefinition;
    if (!binding) return null;
    if (this.isFieldInSection(binding, section)) return null;

    const field: ReportField = {
      name: getFieldDisplayLabel(binding),
      dataBinding: binding.key,
      type: binding.type,
      width: binding.defaultWidth,
      height: binding.type === ReportFieldType.Image ? 15 : 20,
      style: { ...DEFAULT_FIELD_STYLE, alignment },
      sortOrder: rowIndex,
    };

    section.fields = [...section.fields, field];
    return field;
  }

  removeHeaderField(section: ReportSection, field: ReportField, imagePreviewCache: Map<string, string>): void {
    if (field.type === ReportFieldType.Image && field.imageUrl) {
      this.http.delete(`${environment.baseUrl}LoadFile/${field.imageUrl}`).subscribe();
      imagePreviewCache.delete(field.imageUrl);
    }
    section.fields = section.fields.filter(f => f !== field);
  }

  addTableFooterField(
    section: ReportSection,
    binding: DataBindingDefinition,
    getFieldDisplayLabel: (b: DataBindingDefinition) => string,
  ): void {
    if (!section.tableFooterFields) section.tableFooterFields = [];
    if (section.tableFooterFields.some(f => f.dataBinding === binding.key)) return;

    const targetColumn = FOOTER_TO_COLUMN_MAP[binding.key];
    const columnIndex = targetColumn
      ? section.fields.findIndex(f => f.dataBinding === targetColumn)
      : -1;

    const field: ReportField = {
      name: getFieldDisplayLabel(binding),
      dataBinding: binding.key,
      type: binding.type,
      width: binding.defaultWidth,
      height: 20,
      style: { ...DEFAULT_FIELD_STYLE, bold: true },
      sortOrder: columnIndex >= 0 ? columnIndex : section.tableFooterFields.length,
    };

    section.tableFooterFields = [...section.tableFooterFields, field];
  }

  removeTableFooterField(section: ReportSection, field: ReportField): void {
    if (!section.tableFooterFields) return;
    section.tableFooterFields = section.tableFooterFields.filter(f => f !== field);
  }

  addFreeTextRow(section: ReportSection): void {
    if (!section.freeTextRows) section.freeTextRows = [];
    const row: FreeTextRow = {
      id: crypto.randomUUID(),
      text: '',
      position: 'after',
      style: { ...DEFAULT_FIELD_STYLE },
    };
    section.freeTextRows = [...section.freeTextRows, row];
  }

  removeFreeTextRow(section: ReportSection, row: FreeTextRow): void {
    if (!section.freeTextRows) return;
    section.freeTextRows = section.freeTextRows.filter(r => r !== row);
  }

  addFormulaField(section: ReportSection): ReportField {
    const field: ReportField = {
      name: this.translate.instant('setting.report.designer.formulaField'),
      dataBinding: `formula.${crypto.randomUUID()}`,
      type: ReportFieldType.Formula,
      width: 15,
      height: 20,
      style: { ...DEFAULT_FIELD_STYLE },
      formula: '',
      sortOrder: section.fields.length,
    };

    section.fields = [...section.fields, field];
    return field;
  }

  addFormulaFooterField(section: ReportSection): ReportField {
    if (!section.tableFooterFields) section.tableFooterFields = [];

    const field: ReportField = {
      name: this.translate.instant('setting.report.designer.formulaField'),
      dataBinding: `formula.${crypto.randomUUID()}`,
      type: ReportFieldType.Formula,
      width: 15,
      height: 20,
      style: { ...DEFAULT_FIELD_STYLE, bold: true },
      formula: '',
      sortOrder: section.tableFooterFields.length,
    };

    section.tableFooterFields = [...section.tableFooterFields, field];
    return field;
  }
}
