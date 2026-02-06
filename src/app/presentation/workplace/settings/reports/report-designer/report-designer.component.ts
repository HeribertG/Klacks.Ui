import { Component, Input, Output, EventEmitter, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

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
  AVAILABLE_FONTS,
  TextAlignment,
  HeaderRow,
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
export class ReportDesignerComponent implements OnChanges {
  @Input() template!: ReportTemplate;
  @Input() imagePreviewCache = new Map<string, string>();
  @Output() templateChange = new EventEmitter<ReportTemplate>();

  translate = inject(TranslateService);
  private http = inject(HttpClient);

  activeField: ReportField | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['template'] && this.template?.sections) {
      for (const section of this.template.sections) {
        this.loadExistingImages(section);
      }
    }
  }

  TextAlignment = TextAlignment;
  ReportSectionType = ReportSectionType;
  ReportFieldType = ReportFieldType;
  FieldCategory = FieldCategory;
  availableFonts = AVAILABLE_FONTS;

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

  // --- Body Section Helpers ---

  get bodySections(): ReportSection[] {
    return this.template.sections
      .filter(s => s.type === ReportSectionType.WorkTable || s.type === ReportSectionType.ExpensesTable)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  get headerSection(): ReportSection | undefined {
    return this.template.sections.find(s => s.type === ReportSectionType.Header);
  }

  get footerSection(): ReportSection | undefined {
    return this.template.sections.find(s => s.type === ReportSectionType.Footer);
  }

  getBodyTableIndex(section: ReportSection): number {
    return this.bodySections.indexOf(section);
  }

  getBodyTableDropId(section: ReportSection): string {
    return 'body-table-' + this.getBodyTableIndex(section);
  }

  getBodyTableDropIds(sectionType: ReportSectionType): string[] {
    return this.bodySections
      .filter(s => s.type === sectionType)
      .map(s => this.getBodyTableDropId(s));
  }

  getPaletteConnectedTo(group: FieldPaletteGroup): string[] {
    if (group.sectionType === ReportSectionType.Header) {
      return this.headerZoneIds;
    }
    if (group.sectionType === ReportSectionType.Footer) {
      return ['section-footer'];
    }
    return this.getBodyTableDropIds(group.sectionType);
  }

  getTablePaletteId(section: ReportSection): string {
    return section.type === ReportSectionType.WorkTable
      ? 'palette-' + FieldCategory.WorkTable
      : 'palette-' + FieldCategory.ExpensesTable;
  }

  addBodyTable(type: ReportSectionType): void {
    const footerSection = this.footerSection;
    const bodyTables = this.bodySections;
    const lastBodySort = bodyTables.length > 0
      ? Math.max(...bodyTables.map(s => s.sortOrder))
      : (this.headerSection?.sortOrder ?? 0);

    const newSortOrder = lastBodySort + 1;

    if (footerSection && footerSection.sortOrder <= newSortOrder) {
      footerSection.sortOrder = newSortOrder + 1;
    }

    const newSection: ReportSection = {
      type,
      fields: [],
      visible: true,
      sortOrder: newSortOrder,
    };

    this.template.sections = [...this.template.sections, newSection];
    this.emitChange();
  }

  removeBodyTable(section: ReportSection): void {
    if (this.bodySections.length <= 1) return;

    if (this.activeField && section.fields.includes(this.activeField)) {
      this.activeField = null;
    }

    this.template.sections = this.template.sections.filter(s => s !== section);
    this.template.sections
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach((s, i) => s.sortOrder = i);
    this.emitChange();
  }

  // --- Section Helpers ---

  getSection(type: ReportSectionType): ReportSection | undefined {
    return this.template.sections.find(s => s.type === type);
  }

  isFieldInSection(binding: DataBindingDefinition, sectionType: ReportSectionType): boolean {
    const section = this.getSection(sectionType);
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

  getAvailableFields(group: FieldPaletteGroup): DataBindingDefinition[] {
    if (group.sectionType === ReportSectionType.Header || group.sectionType === ReportSectionType.Footer) {
      return group.fields.filter(f => !this.isFieldInSection(f, group.sectionType));
    }
    return group.fields;
  }

  toggleGroup(group: FieldPaletteGroup): void {
    group.collapsed = !group.collapsed;
  }

  // --- Field Selection (Global) ---

  selectField(field: ReportField): void {
    this.activeField = field;
  }

  isHeaderField(field: ReportField): boolean {
    const headerSection = this.getSection(ReportSectionType.Header);
    return headerSection?.fields.includes(field) ?? false;
  }


  // --- Toolbar Actions ---

  toggleBold(field: ReportField): void {
    field.style.bold = !field.style.bold;
    this.emitChange();
  }

  toggleItalic(field: ReportField): void {
    field.style.italic = !field.style.italic;
    this.emitChange();
  }

  toggleUnderline(field: ReportField): void {
    field.style.underline = !field.style.underline;
    this.emitChange();
  }

  setFontFamily(field: ReportField, fontFamily: string): void {
    field.style.fontFamily = fontFamily;
    this.emitChange();
  }

  setFontSize(field: ReportField, size: number): void {
    if (size < 6) size = 6;
    if (size > 48) size = 48;
    field.style.fontSize = size;
    this.emitChange();
  }

  setAlignment(field: ReportField, alignment: TextAlignment): void {
    field.style.alignment = alignment;
    this.emitChange();
  }

  setTextColor(field: ReportField, color: string): void {
    field.style.textColor = color;
    this.emitChange();
  }

  setImageWidth(field: ReportField, width: number): void {
    if (width < 5) width = 5;
    if (width > 200) width = 200;
    field.width = width;
    this.emitChange();
  }

  setImageHeight(field: ReportField, height: number): void {
    if (height < 5) height = 5;
    if (height > 200) height = 200;
    field.height = height;
    this.emitChange();
  }

  // --- Footer Drag & Drop ---

  addFieldToSection(binding: DataBindingDefinition, sectionType: ReportSectionType): void {
    const section = this.getSection(sectionType);
    if (!section || this.isFieldInSection(binding, sectionType)) return;

    const field: ReportField = {
      name: binding.label,
      dataBinding: binding.key,
      type: binding.type,
      width: binding.defaultWidth,
      height: 20,
      style: { ...DEFAULT_FIELD_STYLE },
      sortOrder: section.fields.length,
    };

    section.fields = [...section.fields, field];
    this.emitChange();
  }

  removeFieldFromSection(field: ReportField, section: ReportSection): void {
    section.fields = section.fields.filter(f => f !== field);
    section.fields.forEach((f, i) => f.sortOrder = i);
    if (this.activeField === field) this.activeField = null;
    this.emitChange();
  }

  onFooterFieldDrop(event: CdkDragDrop<ReportField[]>): void {
    const section = this.footerSection;
    if (!section) return;

    if (event.previousContainer === event.container) {
      moveItemInArray(section.fields, event.previousIndex, event.currentIndex);
      section.fields.forEach((f, i) => f.sortOrder = i);
    } else {
      const binding = event.item.data as DataBindingDefinition;
      if (binding && !this.isFieldInSection(binding, ReportSectionType.Footer)) {
        this.addFieldToSection(binding, ReportSectionType.Footer);
      }
    }
    this.emitChange();
  }

  // --- Body Table Drag & Drop ---

  addFieldToBodyTable(binding: DataBindingDefinition, section: ReportSection): void {
    if (this.isFieldInSectionInstance(binding, section)) return;

    const field: ReportField = {
      name: binding.label,
      dataBinding: binding.key,
      type: binding.type,
      width: binding.defaultWidth,
      height: 20,
      style: { ...DEFAULT_FIELD_STYLE },
      sortOrder: section.fields.length,
    };

    section.fields = [...section.fields, field];
    this.emitChange();
  }

  onBodyTableFieldDrop(event: CdkDragDrop<ReportField[]>, section: ReportSection): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(section.fields, event.previousIndex, event.currentIndex);
      section.fields.forEach((f, i) => f.sortOrder = i);
    } else {
      const binding = event.item.data as DataBindingDefinition;
      if (binding && !this.isFieldInSectionInstance(binding, section)) {
        this.addFieldToBodyTable(binding, section);
      }
    }
    this.emitChange();
  }

  onWidthChange(field: ReportField): void {
    if (field.width < 5) field.width = 5;
    if (field.width > 100) field.width = 100;
    this.emitChange();
  }

  // --- Header Row Logic ---

  get headerZoneIds(): string[] {
    const headerSection = this.getSection(ReportSectionType.Header);
    if (!headerSection) return [];
    const rows = this.getHeaderRows(headerSection);
    const ids: string[] = [];
    for (const row of rows) {
      ids.push(`zone-${row.rowIndex}-0`, `zone-${row.rowIndex}-1`, `zone-${row.rowIndex}-2`);
    }
    return ids;
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
    this.emitChange();
  }

  removeHeaderRow(section: ReportSection, rowIndex: number): void {
    const removedFields = section.fields.filter(f => f.sortOrder === rowIndex);
    if (removedFields.includes(this.activeField!)) this.activeField = null;

    section.fields = section.fields.filter(f => f.sortOrder !== rowIndex);
    const rows = this.getHeaderRows(section);
    rows.forEach((row, i) => {
      [...row.left, ...row.center, ...row.right].forEach(f => f.sortOrder = i);
    });
    this.emitChange();
  }

  onHeaderFieldDrop(event: CdkDragDrop<ReportField[]>, section: ReportSection, rowIndex: number, alignment: TextAlignment): void {
    if (event.previousContainer === event.container) {
      return;
    }

    const binding = event.item.data as DataBindingDefinition;
    if (!binding) return;
    if (this.isFieldInSection(binding, ReportSectionType.Header)) return;

    const field: ReportField = {
      name: binding.label,
      dataBinding: binding.key,
      type: binding.type,
      width: binding.defaultWidth,
      height: binding.type === ReportFieldType.Image ? 15 : 20,
      style: { ...DEFAULT_FIELD_STYLE, alignment },
      sortOrder: rowIndex,
    };

    section.fields = [...section.fields, field];
    this.activeField = field;
    this.emitChange();
  }

  removeHeaderField(section: ReportSection, field: ReportField): void {
    if (field.type === ReportFieldType.Image && field.imageUrl) {
      this.http.delete(`${environment.baseUrl}LoadFile/${field.imageUrl}`).subscribe();
      this.imagePreviewCache.delete(field.imageUrl);
    }
    section.fields = section.fields.filter(f => f !== field);
    if (this.activeField === field) this.activeField = null;
    this.emitChange();
  }

  isCustomText(field: ReportField | undefined): boolean {
    return field?.dataBinding === 'report.customText';
  }

  onCustomTextChange(field: ReportField, text: string): void {
    field.name = text;
    this.emitChange();
  }

  // --- Image Upload ---

  async onImageChipUpload(event: Event, section: ReportSection, field: ReportField): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    const imageId = crypto.randomUUID();
    const fileName = `report-img-${imageId}.png`;

    const localDataUrl = await this.fileToDataUrl(file);
    this.imagePreviewCache.set(fileName, localDataUrl);

    const formData = new FormData();
    formData.append('file', file, fileName);

    try {
      await firstValueFrom(this.http.post(`${environment.baseUrl}LoadFile/Upload/`, formData));
      field.imageUrl = fileName;
      field.name = fileName;
      this.activeField = field;
      this.emitChange();
    } catch (err) {
      console.error('Image upload failed:', err);
      this.imagePreviewCache.delete(fileName);
    }

    input.value = '';
  }

  async onImageUpload(event: Event, section: ReportSection, rowIndex: number, alignment: TextAlignment): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    const imageId = crypto.randomUUID();
    const fileName = `report-img-${imageId}.png`;

    const localDataUrl = await this.fileToDataUrl(file);
    this.imagePreviewCache.set(fileName, localDataUrl);

    const formData = new FormData();
    formData.append('file', file, fileName);

    try {
      await firstValueFrom(this.http.post(`${environment.baseUrl}LoadFile/Upload/`, formData));

      const field: ReportField = {
        name: fileName,
        dataBinding: 'report.image',
        type: ReportFieldType.Image,
        width: 30,
        height: 15,
        style: { ...DEFAULT_FIELD_STYLE, alignment },
        sortOrder: rowIndex,
        imageUrl: fileName,
      };

      section.fields = [...section.fields, field];
      this.activeField = field;
      this.emitChange();
    } catch (err) {
      console.error('Image upload failed:', err);
      this.imagePreviewCache.delete(fileName);
    }

    input.value = '';
  }

  loadImagePreview(fileName: string): void {
    if (this.imagePreviewCache.has(fileName)) return;

    this.http.get(`${environment.baseUrl}LoadFile/DownLoad?type=${fileName}`, { responseType: 'blob' })
      .subscribe({
        next: (blob) => {
          if (blob.type === 'text/plain') return;
          const reader = new FileReader();
          reader.onload = () => {
            this.imagePreviewCache.set(fileName, reader.result as string);
          };
          reader.readAsDataURL(blob);
        }
      });
  }

  loadExistingImages(section: ReportSection): void {
    for (const field of section.fields) {
      if (field.type === ReportFieldType.Image && field.imageUrl) {
        this.loadImagePreview(field.imageUrl);
      }
    }
  }

  private fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  emitChange(): void {
    this.templateChange.emit({ ...this.template });
  }
}
