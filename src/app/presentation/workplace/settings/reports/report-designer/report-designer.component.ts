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
  DEFAULT_FIELD_STYLE,
  AVAILABLE_FONTS,
  TextAlignment,
  HeaderRow,
} from 'src/app/domain/models/report/report-field.model';
import { REPORT_DATA_SOURCES, ReportDataSet, getFieldPrefixMap } from 'src/app/domain/models/report/report-data-source.model';
import { BorderLineStyle, CellBorderStyle, DEFAULT_BORDER_SIDE } from 'src/app/domain/models/report/cell-border-style.model';
import { FreeTextRow } from 'src/app/domain/models/report/free-text-row.model';
import { FOOTER_TO_COLUMN_MAP } from 'src/app/domain/models/report/report-footer-mapping.constants';
import { FormulaEvaluationService } from 'src/app/domain/services/report/formula-evaluation.service';
import { getFormulaVariables, getFooterFormulaVariables, FormulaVariableDefinition } from 'src/app/domain/models/report/formula-variables.model';
import { createFormulaTestData, createFooterFormulaTestData } from 'src/app/domain/models/report/formula-test-data';
import { PropertyGridComponent } from 'src/app/presentation/workplace/settings/macros/property-grid/property-grid.component';
import { PropertyMetadata } from 'src/app/domain/models/shift/shift-data-class';

interface FieldPaletteGroup {
  id: string;
  titleKey: string;
  title?: string;
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
  imports: [CommonModule, TranslateModule, FormsModule, CdkDrag, CdkDropList, PropertyGridComponent]
})
export class ReportDesignerComponent implements OnChanges {
  @Input() template!: ReportTemplate;
  @Input() sourceId = 'schedule';
  @Input() dataSetIds: string[] = ['work'];
  @Input() imagePreviewCache = new Map<string, string>();
  @Output() templateChange = new EventEmitter<ReportTemplate>();

  translate = inject(TranslateService);
  private http = inject(HttpClient);
  private formulaService = inject(FormulaEvaluationService);

  activeField: ReportField | null = null;
  fieldPrefixMap = new Map<string, string>();

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
  BorderLineStyle = BorderLineStyle;
  availableFonts = AVAILABLE_FONTS;
  separatorOptions = [
    { value: '\n', labelKey: 'setting.report.designer.separatorNewline' },
    { value: ', ', labelKey: 'setting.report.designer.separatorComma' },
    { value: ' ', labelKey: 'setting.report.designer.separatorSpace' },
    { value: ' - ', labelKey: 'setting.report.designer.separatorDash' },
  ];
  borderLineStyles = [
    { value: BorderLineStyle.None, labelKey: 'setting.report.designer.borderNone' },
    { value: BorderLineStyle.Thin, labelKey: 'setting.report.designer.borderThin' },
    { value: BorderLineStyle.Medium, labelKey: 'setting.report.designer.borderMedium' },
    { value: BorderLineStyle.Thick, labelKey: 'setting.report.designer.borderThick' },
    { value: BorderLineStyle.Dashed, labelKey: 'setting.report.designer.borderDashed' },
    { value: BorderLineStyle.Double, labelKey: 'setting.report.designer.borderDouble' },
  ];

  get activeDataSets(): ReportDataSet[] {
    const source = REPORT_DATA_SOURCES.find(s => s.id === this.sourceId);
    return source?.dataSets.filter(ds => this.dataSetIds.includes(ds.id)) ?? [];
  }

  get paletteGroups(): FieldPaletteGroup[] {
    const dataSets = this.activeDataSets;
    if (dataSets.length === 0) {
      this.fieldPrefixMap = new Map();
      return [];
    }

    this.fieldPrefixMap = getFieldPrefixMap(this.sourceId, this.dataSetIds, k => this.translate.instant(k));

    if (dataSets.length <= 1) {
      return [
        { id: 'header', titleKey: 'setting.report.designer.headerFields', category: FieldCategory.Header, sectionType: ReportSectionType.Header, fields: this.deduplicateFields(dataSets.flatMap(ds => ds.headerFields)), collapsed: false },
        { id: 'table', titleKey: 'setting.report.designer.tableFields', category: FieldCategory.WorkTable, sectionType: ReportSectionType.WorkTable, fields: dataSets[0].tableFields, collapsed: false },
        { id: 'footer', titleKey: 'setting.report.designer.footerFields', category: FieldCategory.Footer, sectionType: ReportSectionType.Footer, fields: dataSets[0].footerFields, collapsed: false },
      ];
    }

    const groups: FieldPaletteGroup[] = [
      { id: 'header', titleKey: 'setting.report.designer.headerFields', category: FieldCategory.Header, sectionType: ReportSectionType.Header, fields: this.deduplicateFields(dataSets.flatMap(ds => ds.headerFields)), collapsed: false },
    ];

    const dsGroups = this.groupDataSetsByFields(dataSets);
    for (let i = 0; i < dsGroups.length; i++) {
      const g = dsGroups[i];
      const combinedTitle = g.dataSets.map(ds => this.translate.instant(ds.i18nKey)).join(' / ');
      groups.push({
        id: `table-${i}`,
        titleKey: 'setting.report.designer.tableFields',
        title: combinedTitle,
        category: FieldCategory.WorkTable,
        sectionType: ReportSectionType.WorkTable,
        fields: g.dataSets[0].tableFields,
        collapsed: false,
      });
    }

    groups.push({
      id: 'footer',
      titleKey: 'setting.report.designer.footerFields',
      category: FieldCategory.Footer,
      sectionType: ReportSectionType.Footer,
      fields: this.deduplicateFields(dataSets.flatMap(ds => ds.footerFields)),
      collapsed: false,
    });

    return groups;
  }

  private groupDataSetsByFields(dataSets: ReportDataSet[]): { dataSets: ReportDataSet[] }[] {
    const groups: { signature: string; dataSets: ReportDataSet[] }[] = [];
    for (const ds of dataSets) {
      const sig = ds.tableFields.map(f => f.key).join(',');
      const existing = groups.find(g => g.signature === sig);
      if (existing) {
        existing.dataSets.push(ds);
      } else {
        groups.push({ signature: sig, dataSets: [ds] });
      }
    }
    return groups;
  }

  private deduplicateFields(fields: DataBindingDefinition[]): DataBindingDefinition[] {
    const map = new Map<string, DataBindingDefinition>();
    for (const f of fields) {
      if (!map.has(f.key)) map.set(f.key, f);
    }
    return Array.from(map.values());
  }

  getFieldDisplayLabel(field: DataBindingDefinition): string {
    const prefix = this.fieldPrefixMap.get(field.key);
    const label = this.translate.instant(field.i18nKey);
    return prefix ? `${prefix}.${label}` : label;
  }

  sectionLabels: Record<number, string> = {
    [ReportSectionType.Header]: 'setting.report.designer.sectionHeader',
    [ReportSectionType.WorkTable]: 'setting.report.designer.sectionWorkTable',
    [ReportSectionType.ExpensesTable]: 'setting.report.designer.sectionExpensesTable',
    [ReportSectionType.Footer]: 'setting.report.designer.sectionFooter',
  };

  // --- Body Section Helpers ---

  get bodySections(): ReportSection[] {
    return this.template.sections
      .filter(s => s.type !== ReportSectionType.Header && s.type !== ReportSectionType.Footer)
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

  get allBodyTableDropIds(): string[] {
    return this.bodySections.map(s => this.getBodyTableDropId(s));
  }

  getPaletteConnectedTo(group: FieldPaletteGroup): string[] {
    if (group.sectionType === ReportSectionType.Header) {
      return this.headerZoneIds;
    }
    if (group.sectionType === ReportSectionType.Footer) {
      return ['section-footer'];
    }
    return this.allBodyTableDropIds;
  }

  get allTablePaletteIds(): string[] {
    const dataSets = this.activeDataSets;
    if (dataSets.length <= 1) return ['palette-table'];
    return this.groupDataSetsByFields(dataSets).map((_, i) => `palette-table-${i}`);
  }

  addBodyTable(): void {
    const type = ReportSectionType.WorkTable;
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
      name: this.getFieldDisplayLabel(binding),
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
      name: this.getFieldDisplayLabel(binding),
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
      name: this.getFieldDisplayLabel(binding),
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

  // --- Border Methods ---

  private ensureCellBorder(field: ReportField): CellBorderStyle {
    if (!field.style.cellBorder) {
      field.style.cellBorder = {
        top: { ...DEFAULT_BORDER_SIDE },
        right: { ...DEFAULT_BORDER_SIDE },
        bottom: { ...DEFAULT_BORDER_SIDE },
        left: { ...DEFAULT_BORDER_SIDE },
      };
    }
    return field.style.cellBorder;
  }

  getBorderSideActive(field: ReportField, side: 'top' | 'right' | 'bottom' | 'left'): boolean {
    return (field.style.cellBorder?.[side]?.lineStyle ?? BorderLineStyle.None) !== BorderLineStyle.None;
  }

  toggleBorderSide(field: ReportField, side: 'top' | 'right' | 'bottom' | 'left'): void {
    const border = this.ensureCellBorder(field);
    if (border[side].lineStyle === BorderLineStyle.None) {
      border[side].lineStyle = BorderLineStyle.Thin;
    } else {
      border[side].lineStyle = BorderLineStyle.None;
    }
    this.emitChange();
  }

  setBorderLineStyle(field: ReportField, style: BorderLineStyle): void {
    const border = this.ensureCellBorder(field);
    const sides: ('top' | 'right' | 'bottom' | 'left')[] = ['top', 'right', 'bottom', 'left'];
    for (const side of sides) {
      if (border[side].lineStyle !== BorderLineStyle.None) {
        border[side].lineStyle = style;
      }
    }
    this.emitChange();
  }

  setBorderColor(field: ReportField, color: string): void {
    const border = this.ensureCellBorder(field);
    const sides: ('top' | 'right' | 'bottom' | 'left')[] = ['top', 'right', 'bottom', 'left'];
    for (const side of sides) {
      border[side].color = color;
    }
    this.emitChange();
  }

  setAllBorders(field: ReportField, lineStyle: BorderLineStyle): void {
    const border = this.ensureCellBorder(field);
    const sides: ('top' | 'right' | 'bottom' | 'left')[] = ['top', 'right', 'bottom', 'left'];
    for (const side of sides) {
      border[side].lineStyle = lineStyle;
    }
    this.emitChange();
  }

  getActiveBorderLineStyle(field: ReportField): BorderLineStyle {
    const border = field.style.cellBorder;
    if (!border) return BorderLineStyle.None;
    const sides: ('top' | 'right' | 'bottom' | 'left')[] = ['top', 'right', 'bottom', 'left'];
    for (const side of sides) {
      if (border[side].lineStyle !== BorderLineStyle.None) {
        return border[side].lineStyle;
      }
    }
    return BorderLineStyle.None;
  }

  getActiveBorderColor(field: ReportField): string {
    const border = field.style.cellBorder;
    if (!border) return '#000000';
    const sides: ('top' | 'right' | 'bottom' | 'left')[] = ['top', 'right', 'bottom', 'left'];
    for (const side of sides) {
      if (border[side].lineStyle !== BorderLineStyle.None) {
        return border[side].color;
      }
    }
    return '#000000';
  }

  // --- Table Footer Methods ---

  hasTableFooter(section: ReportSection): boolean {
    return section.tableFooterFields !== undefined;
  }

  toggleTableFooter(section: ReportSection): void {
    if (this.hasTableFooter(section)) {
      section.tableFooterFields = undefined;
    } else {
      section.tableFooterFields = [];
    }
    this.emitChange();
  }

  getAvailableFooterFields(): DataBindingDefinition[] {
    const dataSets = this.activeDataSets;
    return dataSets.flatMap(ds => ds.footerFields);
  }

  addTableFooterField(section: ReportSection, binding: DataBindingDefinition): void {
    if (!section.tableFooterFields) section.tableFooterFields = [];
    if (section.tableFooterFields.some(f => f.dataBinding === binding.key)) return;

    const targetColumn = FOOTER_TO_COLUMN_MAP[binding.key];
    const columnIndex = targetColumn
      ? section.fields.findIndex(f => f.dataBinding === targetColumn)
      : -1;

    const field: ReportField = {
      name: this.getFieldDisplayLabel(binding),
      dataBinding: binding.key,
      type: binding.type,
      width: binding.defaultWidth,
      height: 20,
      style: { ...DEFAULT_FIELD_STYLE, bold: true },
      sortOrder: columnIndex >= 0 ? columnIndex : section.tableFooterFields.length,
    };

    section.tableFooterFields = [...section.tableFooterFields, field];
    this.emitChange();
  }

  isTableFooterField(field: ReportField): boolean {
    return this.bodySections.some(s => s.tableFooterFields?.includes(field));
  }

  toggleHideLabel(field: ReportField): void {
    field.hideLabel = !field.hideLabel;
    this.emitChange();
  }

  removeTableFooterField(section: ReportSection, field: ReportField): void {
    if (!section.tableFooterFields) return;
    section.tableFooterFields = section.tableFooterFields.filter(f => f !== field);
    if (this.activeField === field) this.activeField = null;
    this.emitChange();
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

  // --- Free Text Row Methods ---

  addFreeTextRow(section: ReportSection): void {
    if (!section.freeTextRows) section.freeTextRows = [];
    const row: FreeTextRow = {
      id: crypto.randomUUID(),
      text: '',
      position: 'after',
      style: { ...DEFAULT_FIELD_STYLE },
    };
    section.freeTextRows = [...section.freeTextRows, row];
    this.emitChange();
  }

  removeFreeTextRow(section: ReportSection, row: FreeTextRow): void {
    if (!section.freeTextRows) return;
    section.freeTextRows = section.freeTextRows.filter(r => r !== row);
    this.emitChange();
  }

  onFreeTextChange(row: FreeTextRow, text: string): void {
    row.text = text;
    this.emitChange();
  }

  onFreeTextPositionChange(row: FreeTextRow, position: 'before' | 'after'): void {
    row.position = position;
    this.emitChange();
  }

  // --- Merged Fields Methods ---

  isBodyTableField(field: ReportField): boolean {
    return this.bodySections.some(s => s.fields.includes(field));
  }

  private mergeFieldLabelCache = new Map<string, string>();

  getAvailableMergeFields(field: ReportField): { key: string; label: string }[] {
    this.mergeFieldLabelCache.clear();
    const usedBindings = new Set([field.dataBinding, ...(field.additionalBindings ?? [])]);
    const seen = new Set<string>();
    const result: { key: string; label: string }[] = [];

    for (const ds of this.activeDataSets) {
      const dsLabel = this.translate.instant(ds.i18nKey);
      for (const f of ds.tableFields) {
        if (seen.has(f.key) || usedBindings.has(f.key) || f.type === ReportFieldType.Image) continue;
        seen.add(f.key);
        const fieldLabel = this.translate.instant(f.i18nKey);
        const fullLabel = `${dsLabel}.${fieldLabel}`;
        this.mergeFieldLabelCache.set(f.key, fullLabel);
        result.push({ key: f.key, label: fullLabel });
      }
    }
    return result;
  }

  addMergedBinding(field: ReportField, key: string): void {
    if (!key) return;
    if (!field.additionalBindings) field.additionalBindings = [];
    if (field.additionalBindings.includes(key)) return;
    field.additionalBindings = [...field.additionalBindings, key];
    if (!field.bindingSeparator) field.bindingSeparator = '\n';
    this.emitChange();
  }

  removeMergedBinding(field: ReportField, key: string): void {
    if (!field.additionalBindings) return;
    field.additionalBindings = field.additionalBindings.filter(b => b !== key);
    if (field.additionalBindings.length === 0) {
      field.additionalBindings = undefined;
      field.bindingSeparator = undefined;
    }
    this.emitChange();
  }

  setBindingSeparator(field: ReportField, separator: string): void {
    field.bindingSeparator = separator;
    this.emitChange();
  }

  getMergedFieldLabel(key: string): string {
    const cached = this.mergeFieldLabelCache.get(key);
    if (cached) return cached;
    for (const ds of this.activeDataSets) {
      const def = ds.tableFields.find(f => f.key === key);
      if (def) {
        const label = `${this.translate.instant(ds.i18nKey)}.${this.translate.instant(def.i18nKey)}`;
        this.mergeFieldLabelCache.set(key, label);
        return label;
      }
    }
    return key;
  }

  // --- Formula Field Methods ---

  isFormulaField(field: ReportField): boolean {
    return field.type === ReportFieldType.Formula;
  }

  addFormulaField(section: ReportSection): void {
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
    this.activeField = field;
    this.emitChange();
  }

  addFormulaFooterField(section: ReportSection): void {
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
    this.activeField = field;
    this.emitChange();
  }

  getFormulaStatus(field: ReportField): 'empty' | 'valid' | 'error' {
    if (!field.formula) return 'empty';
    const result = this.formulaService.validateFormula(field.formula);
    return result.valid ? 'valid' : 'error';
  }

  onFormulaChange(field: ReportField, formula: string): void {
    field.formula = formula;
    this.formulaService.clearCache();
    this.emitChange();
  }

  onFormulaNameChange(field: ReportField, name: string): void {
    field.name = name;
    this.emitChange();
  }

  getFormulaVariableDefs(): FormulaVariableDefinition[] {
    return getFormulaVariables(this.sourceId, this.dataSetIds);
  }

  getFooterFormulaVariableDefs(): FormulaVariableDefinition[] {
    return getFooterFormulaVariables(this.sourceId, this.dataSetIds);
  }

  testFormula(field: ReportField): string {
    if (!field.formula) return '';
    return this.formulaService.evaluateFormula(field.formula, { ...this.formulaTestData });
  }

  showFormulaEditor = false;
  formulaEditorField: ReportField | null = null;
  formulaTestResult = '';
  formulaTestData: Record<string, unknown> = {};
  formulaTestMetadata?: PropertyMetadata;

  openFormulaEditor(field: ReportField): void {
    this.formulaEditorField = field;
    this.showFormulaEditor = true;
    this.formulaTestResult = '';
    const isFooter = this.bodySections.some(s => s.tableFooterFields?.includes(field));
    const testObj = isFooter
      ? createFooterFormulaTestData(this.sourceId)
      : createFormulaTestData(this.sourceId, this.dataSetIds);
    this.formulaTestData = testObj;
    this.formulaTestMetadata = (testObj.constructor as { metadata?: PropertyMetadata }).metadata;
  }

  closeFormulaEditor(): void {
    this.showFormulaEditor = false;
    this.formulaEditorField = null;
    this.formulaTestResult = '';
  }

  runFormulaTest(): void {
    if (this.formulaEditorField) {
      this.formulaTestResult = this.testFormula(this.formulaEditorField);
    }
  }

  onMergeRowsChange(value: boolean): void {
    this.template.mergeRows = value;
    this.emitChange();
  }

  onShowFullPeriodChange(value: boolean): void {
    this.template.showFullPeriod = value;
    this.emitChange();
  }

  emitChange(): void {
    this.templateChange.emit({ ...this.template });
  }
}
