// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Visual report designer component for configuring report templates with sections, fields, and styling.
 * @param template - The report template being edited
 * @param sourceId - Active data source identifier (e.g. 'schedule')
 * @param dataSetIds - Active data set identifiers (e.g. ['work'])
 * @param imagePreviewCache - Shared cache for image preview DataURLs
 */

import { Component, Input, Output, EventEmitter, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';

import { ReportTemplate } from 'src/app/domain/models/report/report-template.model';
import { ReportSection, ReportSectionType } from 'src/app/domain/models/report/report-section.model';
import {
  ReportField,
  ReportFieldType,
  DataBindingDefinition,
  FieldCategory,
  AVAILABLE_FONTS,
  TextAlignment,
  HeaderRow,
} from 'src/app/domain/models/report/report-field.model';
import { REPORT_DATA_SOURCES, ReportDataSet, getFieldPrefixMap } from 'src/app/domain/models/report/report-data-source.model';
import { BorderLineStyle } from 'src/app/domain/models/report/cell-border-style.model';
import { FreeTextRow } from 'src/app/domain/models/report/free-text-row.model';
import { FormulaVariableDefinition } from 'src/app/domain/models/report/formula-variables.model';
import { PropertyGridComponent } from 'src/app/presentation/workplace/settings/macros/property-grid/property-grid.component';
import { PropertyMetadata } from 'src/app/domain/models/shift/shift-data-class';

import { ReportDesignerFieldService } from './report-designer-field.service';
import { ReportDesignerBorderService } from './report-designer-border.service';
import { ReportDesignerFormulaService } from './report-designer-formula.service';
import { ReportDesignerImageService } from './report-designer-image.service';

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
  imports: [CommonModule, TranslateModule, FormsModule, CdkDrag, CdkDropList, PropertyGridComponent],
  providers: [ReportDesignerFieldService, ReportDesignerBorderService, ReportDesignerFormulaService, ReportDesignerImageService],
})
export class ReportDesignerComponent implements OnChanges {
  @Input() template!: ReportTemplate;
  @Input() sourceId = 'schedule';
  @Input() dataSetIds: string[] = ['work'];
  @Input() imagePreviewCache = new Map<string, string>();
  @Output() templateChange = new EventEmitter<ReportTemplate>();

  translate = inject(TranslateService);
  private fieldService = inject(ReportDesignerFieldService);
  private borderService = inject(ReportDesignerBorderService);
  private formulaSvc = inject(ReportDesignerFormulaService);
  private imageService = inject(ReportDesignerImageService);

  activeField: ReportField | null = null;
  fieldPrefixMap = new Map<string, string>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['template'] && this.template?.sections) {
      for (const section of this.template.sections) {
        this.imageService.loadExistingImages(section, this.imagePreviewCache);
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

  getSection(type: ReportSectionType): ReportSection | undefined {
    return this.template.sections.find(s => s.type === type);
  }

  isFieldInSection(binding: DataBindingDefinition, sectionType: ReportSectionType): boolean {
    return this.fieldService.isFieldInSection(binding, this.getSection(sectionType));
  }

  isFieldInSectionInstance(binding: DataBindingDefinition, section: ReportSection): boolean {
    return this.fieldService.isFieldInSectionInstance(binding, section);
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

  selectField(field: ReportField): void {
    this.activeField = field;
  }

  isHeaderField(field: ReportField): boolean {
    const headerSection = this.getSection(ReportSectionType.Header);
    return headerSection?.fields.includes(field) ?? false;
  }

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

  addFieldToSection(binding: DataBindingDefinition, sectionType: ReportSectionType): void {
    this.fieldService.addFieldToSection(binding, this.getSection(sectionType), b => this.getFieldDisplayLabel(b));
    this.emitChange();
  }

  removeFieldFromSection(field: ReportField, section: ReportSection): void {
    this.fieldService.removeFieldFromSection(field, section);
    if (this.activeField === field) this.activeField = null;
    this.emitChange();
  }

  onFooterFieldDrop(event: CdkDragDrop<ReportField[]>): void {
    this.fieldService.onFooterFieldDrop(event, this.footerSection, b => this.getFieldDisplayLabel(b));
    this.emitChange();
  }

  addFieldToBodyTable(binding: DataBindingDefinition, section: ReportSection): void {
    this.fieldService.addFieldToBodyTable(binding, section, b => this.getFieldDisplayLabel(b));
    this.emitChange();
  }

  onBodyTableFieldDrop(event: CdkDragDrop<ReportField[]>, section: ReportSection): void {
    this.fieldService.onBodyTableFieldDrop(event, section, b => this.getFieldDisplayLabel(b));
    this.emitChange();
  }

  onWidthChange(field: ReportField): void {
    if (field.width < 5) field.width = 5;
    if (field.width > 100) field.width = 100;
    this.emitChange();
  }

  get headerZoneIds(): string[] {
    const headerSection = this.getSection(ReportSectionType.Header);
    if (!headerSection) return [];
    const rows = this.fieldService.getHeaderRows(headerSection);
    const ids: string[] = [];
    for (const row of rows) {
      ids.push(`zone-${row.rowIndex}-0`, `zone-${row.rowIndex}-1`, `zone-${row.rowIndex}-2`);
    }
    return ids;
  }

  getHeaderRows(section: ReportSection): HeaderRow[] {
    return this.fieldService.getHeaderRows(section);
  }

  addHeaderRow(section: ReportSection): void {
    this.fieldService.addHeaderRow(section);
    this.emitChange();
  }

  removeHeaderRow(section: ReportSection, rowIndex: number): void {
    this.activeField = this.fieldService.removeHeaderRow(section, rowIndex, this.activeField);
    this.emitChange();
  }

  onHeaderFieldDrop(event: CdkDragDrop<ReportField[]>, section: ReportSection, rowIndex: number, alignment: TextAlignment): void {
    const field = this.fieldService.onHeaderFieldDrop(event, section, rowIndex, alignment, b => this.getFieldDisplayLabel(b));
    if (field) this.activeField = field;
    this.emitChange();
  }

  removeHeaderField(section: ReportSection, field: ReportField): void {
    this.fieldService.removeHeaderField(section, field, this.imagePreviewCache);
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

  async onImageChipUpload(event: Event, section: ReportSection, field: ReportField): Promise<void> {
    const success = await this.imageService.onImageChipUpload(event, field, this.imagePreviewCache);
    if (success) {
      this.activeField = field;
      this.emitChange();
    }
  }

  async onImageUpload(event: Event, section: ReportSection, rowIndex: number, alignment: TextAlignment): Promise<void> {
    const field = await this.imageService.onImageUpload(event, section, rowIndex, alignment, this.imagePreviewCache);
    if (field) {
      this.activeField = field;
      this.emitChange();
    }
  }

  loadImagePreview(fileName: string): void {
    this.imageService.loadImagePreview(fileName, this.imagePreviewCache);
  }

  getBorderSideActive(field: ReportField, side: 'top' | 'right' | 'bottom' | 'left'): boolean {
    return this.borderService.getBorderSideActive(field, side);
  }

  toggleBorderSide(field: ReportField, side: 'top' | 'right' | 'bottom' | 'left'): void {
    this.borderService.toggleBorderSide(field, side);
    this.emitChange();
  }

  setBorderLineStyle(field: ReportField, style: BorderLineStyle): void {
    this.borderService.setBorderLineStyle(field, style);
    this.emitChange();
  }

  setBorderColor(field: ReportField, color: string): void {
    this.borderService.setBorderColor(field, color);
    this.emitChange();
  }

  setAllBorders(field: ReportField, lineStyle: BorderLineStyle): void {
    this.borderService.setAllBorders(field, lineStyle);
    this.emitChange();
  }

  getActiveBorderLineStyle(field: ReportField): BorderLineStyle {
    return this.borderService.getActiveBorderLineStyle(field);
  }

  getActiveBorderColor(field: ReportField): string {
    return this.borderService.getActiveBorderColor(field);
  }

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
    this.fieldService.addTableFooterField(section, binding, b => this.getFieldDisplayLabel(b));
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
    this.fieldService.removeTableFooterField(section, field);
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

  addFreeTextRow(section: ReportSection): void {
    this.fieldService.addFreeTextRow(section);
    this.emitChange();
  }

  removeFreeTextRow(section: ReportSection, row: FreeTextRow): void {
    this.fieldService.removeFreeTextRow(section, row);
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

  isFormulaField(field: ReportField): boolean {
    return field.type === ReportFieldType.Formula;
  }

  addFormulaField(section: ReportSection): void {
    this.activeField = this.fieldService.addFormulaField(section);
    this.emitChange();
  }

  addFormulaFooterField(section: ReportSection): void {
    this.activeField = this.fieldService.addFormulaFooterField(section);
    this.emitChange();
  }

  getFormulaStatus(field: ReportField): 'empty' | 'valid' | 'error' {
    return this.formulaSvc.getFormulaStatus(field);
  }

  onFormulaChange(field: ReportField, formula: string): void {
    this.formulaSvc.onFormulaChange(field, formula);
    this.emitChange();
  }

  onFormulaNameChange(field: ReportField, name: string): void {
    this.formulaSvc.onFormulaNameChange(field, name);
    this.emitChange();
  }

  getFormulaVariableDefs(): FormulaVariableDefinition[] {
    return this.formulaSvc.getFormulaVariableDefs(this.sourceId, this.dataSetIds);
  }

  getFooterFormulaVariableDefs(): FormulaVariableDefinition[] {
    return this.formulaSvc.getFooterFormulaVariableDefs(this.sourceId, this.dataSetIds);
  }

  testFormula(field: ReportField): string {
    return this.formulaSvc.testFormula(field);
  }

  get showFormulaEditor(): boolean {
    return this.formulaSvc.showFormulaEditor;
  }

  get formulaEditorField(): ReportField | null {
    return this.formulaSvc.formulaEditorField;
  }

  get formulaTestResult(): string {
    return this.formulaSvc.formulaTestResult;
  }

  get formulaTestData(): Record<string, unknown> {
    return this.formulaSvc.formulaTestData;
  }

  set formulaTestData(value: Record<string, unknown>) {
    this.formulaSvc.formulaTestData = value;
  }

  get formulaTestMetadata(): PropertyMetadata | undefined {
    return this.formulaSvc.formulaTestMetadata;
  }

  openFormulaEditor(field: ReportField): void {
    this.formulaSvc.openFormulaEditor(field, this.bodySections, this.sourceId, this.dataSetIds);
  }

  closeFormulaEditor(): void {
    this.formulaSvc.closeFormulaEditor();
  }

  runFormulaTest(): void {
    this.formulaSvc.runFormulaTest();
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
