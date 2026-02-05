import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';

import { ReportTemplate } from 'src/app/domain/models/report/report-template.model';
import { ReportSection, ReportSectionType } from 'src/app/domain/models/report/report-section.model';
import {
  ReportField,
  ReportFieldType,
  DataBindingDefinition,
  FieldCategory,
  HEADER_FIELDS,
  WORK_TABLE_FIELDS,
  EXPENSES_TABLE_FIELDS,
  FOOTER_FIELDS,
  DEFAULT_FIELD_STYLE,
  TextAlignment,
} from 'src/app/domain/models/report/report-field.model';

interface FieldPaletteGroup {
  titleKey: string;
  category: FieldCategory;
  sectionType: ReportSectionType;
  fields: DataBindingDefinition[];
  collapsed: boolean;
}

@Component({
  selector: 'app-report-designer',
  templateUrl: './report-designer.component.html',
  styleUrls: ['./report-designer.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslateModule, FormsModule, CdkDrag, CdkDropList]
})
export class ReportDesignerComponent {
  @Input() template!: ReportTemplate;
  @Output() templateChange = new EventEmitter<ReportTemplate>();

  translate = inject(TranslateService);

  paletteGroups: FieldPaletteGroup[] = [
    { titleKey: 'setting.report.designer.headerFields', category: FieldCategory.Header, sectionType: ReportSectionType.Header, fields: HEADER_FIELDS, collapsed: false },
    { titleKey: 'setting.report.designer.workFields', category: FieldCategory.WorkTable, sectionType: ReportSectionType.WorkTable, fields: WORK_TABLE_FIELDS, collapsed: false },
    { titleKey: 'setting.report.designer.expensesFields', category: FieldCategory.ExpensesTable, sectionType: ReportSectionType.ExpensesTable, fields: EXPENSES_TABLE_FIELDS, collapsed: false },
    { titleKey: 'setting.report.designer.footerFields', category: FieldCategory.Footer, sectionType: ReportSectionType.Footer, fields: FOOTER_FIELDS, collapsed: false },
  ];

  sectionLabels: Record<number, string> = {
    [ReportSectionType.Header]: 'setting.report.designer.sectionHeader',
    [ReportSectionType.WorkTable]: 'setting.report.designer.sectionWorkTable',
    [ReportSectionType.ExpensesTable]: 'setting.report.designer.sectionExpensesTable',
    [ReportSectionType.Footer]: 'setting.report.designer.sectionFooter',
  };

  getSection(type: ReportSectionType): ReportSection | undefined {
    return this.template.sections.find(s => s.type === type);
  }

  isFieldInSection(binding: DataBindingDefinition, sectionType: ReportSectionType): boolean {
    const section = this.getSection(sectionType);
    return section?.fields.some(f => f.dataBinding === binding.key) ?? false;
  }

  getAvailableFields(group: FieldPaletteGroup): DataBindingDefinition[] {
    return group.fields.filter(f => !this.isFieldInSection(f, group.sectionType));
  }

  toggleGroup(group: FieldPaletteGroup): void {
    group.collapsed = !group.collapsed;
  }

  addFieldToSection(binding: DataBindingDefinition, sectionType: ReportSectionType): void {
    const section = this.getSection(sectionType);
    if (!section || this.isFieldInSection(binding, sectionType)) return;

    const field: ReportField = {
      name: binding.label,
      dataBinding: binding.key,
      type: binding.type,
      width: binding.defaultWidth,
      style: { ...DEFAULT_FIELD_STYLE },
      sortOrder: section.fields.length,
    };

    section.fields = [...section.fields, field];
    this.emitChange();
  }

  removeFieldFromSection(field: ReportField, sectionType: ReportSectionType): void {
    const section = this.getSection(sectionType);
    if (!section) return;

    section.fields = section.fields.filter(f => f.dataBinding !== field.dataBinding);
    section.fields.forEach((f, i) => f.sortOrder = i);
    this.emitChange();
  }

  onFieldDrop(event: CdkDragDrop<ReportField[]>, sectionType: ReportSectionType): void {
    const section = this.getSection(sectionType);
    if (!section) return;

    if (event.previousContainer === event.container) {
      moveItemInArray(section.fields, event.previousIndex, event.currentIndex);
      section.fields.forEach((f, i) => f.sortOrder = i);
    } else {
      const binding = event.item.data as DataBindingDefinition;
      if (binding && !this.isFieldInSection(binding, sectionType)) {
        this.addFieldToSection(binding, sectionType);
      }
    }
    this.emitChange();
  }

  onWidthChange(field: ReportField): void {
    if (field.width < 5) field.width = 5;
    if (field.width > 100) field.width = 100;
    this.emitChange();
  }

  toggleBold(field: ReportField): void {
    field.style.bold = !field.style.bold;
    this.emitChange();
  }

  setAlignment(field: ReportField, alignment: TextAlignment): void {
    field.style.alignment = alignment;
    this.emitChange();
  }

  TextAlignment = TextAlignment;
  ReportSectionType = ReportSectionType;

  private emitChange(): void {
    this.templateChange.emit({ ...this.template });
  }
}
