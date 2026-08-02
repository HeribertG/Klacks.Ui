// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Visual report designer component for configuring report templates with sections, fields, and styling.
 * @param template - The report template being edited
 * @param sourceId - Active data source identifier (e.g. 'schedule')
 * @param dataSetIds - Active data set identifiers (e.g. ['work'])
 * @param imagePreviewCache - Shared cache for image preview DataURLs
 */

import { Component, ChangeDetectionStrategy, inject, effect, input, model } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';

import { PageGeometry, ReportTemplate, resolvePageGeometry } from 'src/app/domain/models/report/report-template.model';
import { ReportSection, ReportSectionType } from 'src/app/domain/models/report/report-section.model';
import {
  ReportField,
  ReportFieldType,
  DataBindingDefinition,
  FieldCategory,
  AVAILABLE_FONTS,
  TextAlignment,
} from 'src/app/domain/models/report/report-field.model';
import { PAGE_LAYOUT_FIELD_KEYS, REPORT_DATA_SOURCES, ReportDataSet, getFieldPrefixMap } from 'src/app/domain/models/report/report-data-source.model';
import { BorderLineStyle } from 'src/app/domain/models/report/cell-border-style.model';
import { PropertyGridComponent } from 'src/app/presentation/workplace/settings/macros/property-grid/property-grid.component';
import { StyleConditionsComponent } from './style-conditions/style-conditions.component';

import { ReportDesignerFieldService } from './report-designer-field.service';
import { ReportDesignerBorderService } from './report-designer-border.service';
import { ReportDesignerFormulaService } from './report-designer-formula.service';
import { ReportDesignerImageService } from './report-designer-image.service';
import { FormulaEvaluationService } from 'src/app/domain/services/report/formula-evaluation.service';
import { toParameterVariableName } from 'src/app/domain/helpers/report-parameter.helper';

const COLUMN_WIDTH_TOTAL_PERCENT = 100;
const MIN_SECTION_WIDTH_PERCENT = 10;

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
  imports: [TranslateModule, FormsModule, CdkDrag, CdkDropList, PropertyGridComponent, StyleConditionsComponent],
  providers: [ReportDesignerFieldService, ReportDesignerBorderService, ReportDesignerFormulaService, ReportDesignerImageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportDesignerComponent {
  readonly template = model.required<ReportTemplate>();
  readonly sourceId = input('schedule');
  readonly dataSetIds = input<string[]>(['work']);
  readonly imagePreviewCache = input(new Map<string, string>());
  readonly parameterKeys = input<string[]>([]);

  translate = inject(TranslateService);
  protected fieldService = inject(ReportDesignerFieldService);
  protected borderService = inject(ReportDesignerBorderService);
  protected formulaSvc = inject(ReportDesignerFormulaService);
  private imageService = inject(ReportDesignerImageService);
  private formulaEvaluation = inject(FormulaEvaluationService);

  activeField: ReportField | null = null;
  fieldPrefixMap = new Map<string, string>();
  showStyleConditions = false;

  constructor() {
    effect(() => {
      const t = this.template();
      if (t?.sections) {
        for (const section of t.sections) {
          this.imageService.loadExistingImages(section, this.imagePreviewCache());
        }
      }
    });
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

  get pageGeometry(): PageGeometry {
    return resolvePageGeometry(this.template().pageSetup);
  }

  /**
   * Sum of the column widths of a table, in percent of the table width and in millimetres.
   * A sum above 100 percent means the columns are scaled down in the PDF.
   */
  getColumnWidthSummary(section: ReportSection): { percent: number; mm: number; exceeds: boolean } {
    const percent = section.fields.reduce((sum, field) => sum + (field.width || 0), 0);
    const tableWidthMm = this.pageGeometry.usableWidthMm * (this.clampSectionWidth(section.widthPercent) / 100);
    return {
      percent: Math.round(percent),
      mm: Math.round(tableWidthMm),
      exceeds: percent > COLUMN_WIDTH_TOTAL_PERCENT,
    };
  }

  /**
   * Columns a table can be grouped by. Numeric columns are excluded because
   * grouping by a measured value produces one group per row.
   */
  getGroupableFields(section: ReportSection): ReportField[] {
    return section.fields.filter(
      f => f.type !== ReportFieldType.Number
        && f.type !== ReportFieldType.Currency
        && f.type !== ReportFieldType.Image
        && f.type !== ReportFieldType.Formula
    );
  }

  setRowFilter(section: ReportSection, expression: string): void {
    section.rowFilter = expression.trim().length > 0 ? expression : undefined;
    this.emitChange();
  }

  /**
   * Status of a row filter expression, shown next to the input so a typo is visible
   * at design time instead of producing a report without rows.
   */
  getRowFilterStatus(section: ReportSection): 'empty' | 'valid' | 'error' | 'unknownParameter' {
    const expression = section.rowFilter?.trim();
    if (!expression) {
      return 'empty';
    }
    if (!this.formulaEvaluation.validateFormula(expression).valid) {
      return 'error';
    }
    return this.findUnknownParameterReference(expression) ? 'unknownParameter' : 'valid';
  }

  /**
   * Finds a param_* reference the template does not declare. The syntax check cannot see
   * this, so a renamed parameter would leave a green marker next to a dead filter.
   */
  findUnknownParameterReference(expression: string): string | undefined {
    const known = new Set(this.parameterKeys().map(key => toParameterVariableName(key)));
    const referenced = expression.match(/param_[A-Za-z0-9_]+/g) ?? [];
    return referenced.find(name => !known.has(name));
  }

  setGroupBy(section: ReportSection, dataBinding: string): void {
    section.groupBy = dataBinding || undefined;
    if (!section.groupBy) {
      section.groupSubtotals = undefined;
    }
    this.emitChange();
  }

  toggleGroupSubtotals(section: ReportSection, value: boolean): void {
    section.groupSubtotals = value;
    this.emitChange();
  }

  distributeColumnWidths(section: ReportSection): void {
    if (section.fields.length === 0) {
      return;
    }
    const even = COLUMN_WIDTH_TOTAL_PERCENT / section.fields.length;
    for (const field of section.fields) {
      field.width = Math.round(even * 10) / 10;
    }
    this.emitChange();
  }

  private clampSectionWidth(value: number | undefined): number {
    if (value === undefined || value === null) return COLUMN_WIDTH_TOTAL_PERCENT;
    return Math.min(COLUMN_WIDTH_TOTAL_PERCENT, Math.max(MIN_SECTION_WIDTH_PERCENT, value));
  }

  get activeDataSets(): ReportDataSet[] {
    const source = REPORT_DATA_SOURCES.find(s => s.id === this.sourceId());
    return source?.dataSets.filter(ds => this.dataSetIds().includes(ds.id)) ?? [];
  }

  get paletteGroups(): FieldPaletteGroup[] {
    const dataSets = this.activeDataSets;
    if (dataSets.length === 0) {
      this.fieldPrefixMap = new Map();
      return [];
    }

    this.fieldPrefixMap = getFieldPrefixMap(this.sourceId(), this.dataSetIds(), k => this.translate.instant(k));

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
    return this.template().sections
      .filter(s => s.type !== ReportSectionType.Header && s.type !== ReportSectionType.Footer)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  get headerSection(): ReportSection | undefined {
    return this.template().sections.find(s => s.type === ReportSectionType.Header);
  }

  get footerSection(): ReportSection | undefined {
    return this.template().sections.find(s => s.type === ReportSectionType.Footer);
  }

  getBodyTableDropId(section: ReportSection): string {
    return 'body-table-' + this.bodySections.indexOf(section);
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

    const t = this.template();
    t.sections = [...t.sections, newSection];
    this.emitChange();
  }

  removeBodyTable(section: ReportSection): void {
    if (this.bodySections.length <= 1) return;

    if (this.activeField && section.fields.includes(this.activeField)) {
      this.activeField = null;
    }

    const t = this.template();
    t.sections = t.sections.filter(s => s !== section);
    t.sections
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach((s, i) => s.sortOrder = i);
    this.emitChange();
  }

  getSection(type: ReportSectionType): ReportSection | undefined {
    return this.template().sections.find(s => s.type === type);
  }

  getAvailableFields(group: FieldPaletteGroup): DataBindingDefinition[] {
    if (group.sectionType === ReportSectionType.Header || group.sectionType === ReportSectionType.Footer) {
      return group.fields.filter(f => !this.fieldService.isFieldInSection(f, this.getSection(group.sectionType)));
    }
    return group.fields;
  }

  selectField(field: ReportField): void {
    this.activeField = field;
  }

  isHeaderField(field: ReportField): boolean {
    const headerSection = this.getSection(ReportSectionType.Header);
    return headerSection?.fields.includes(field) ?? false;
  }

  setFontSize(field: ReportField, size: number): void {
    if (size < 6) size = 6;
    if (size > 48) size = 48;
    field.style.fontSize = size;
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

  removeFieldFromSection(field: ReportField, section: ReportSection): void {
    this.fieldService.removeFieldFromSection(field, section);
    if (this.activeField === field) this.activeField = null;
    this.emitChange();
  }

  onFooterFieldDrop(event: CdkDragDrop<ReportField[]>): void {
    this.fieldService.onFooterFieldDrop(event, this.footerSection, b => this.getFieldDisplayLabel(b));
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
    this.fieldService.removeHeaderField(section, field, this.imagePreviewCache());
    if (this.activeField === field) this.activeField = null;
    this.emitChange();
  }

  async onImageChipUpload(event: Event, section: ReportSection, field: ReportField): Promise<void> {
    const success = await this.imageService.onImageChipUpload(event, field, this.imagePreviewCache());
    if (success) {
      this.activeField = field;
      this.emitChange();
    }
  }

  async onImageUpload(event: Event, section: ReportSection, rowIndex: number, alignment: TextAlignment): Promise<void> {
    const field = await this.imageService.onImageUpload(event, section, rowIndex, alignment, this.imagePreviewCache());
    if (field) {
      this.activeField = field;
      this.emitChange();
    }
  }

  toggleTableFooter(section: ReportSection): void {
    if (section.tableFooterFields !== undefined) {
      section.tableFooterFields = undefined;
    } else {
      section.tableFooterFields = [];
    }
    this.emitChange();
  }

  isSectionShowFullPeriod(section: ReportSection): boolean {
    return section.showFullPeriod ?? this.template().showFullPeriod ?? false;
  }

  toggleSectionShowFullPeriod(section: ReportSection, value: boolean): void {
    section.showFullPeriod = value;
    this.emitChange();
  }

  setSectionTitle(section: ReportSection, value: string): void {
    section.title = value;
    this.emitChange();
  }

  setSectionWidthPercent(section: ReportSection, raw: string): void {
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed)) {
      section.widthPercent = undefined;
    } else {
      section.widthPercent = this.clampSectionWidth(parsed);
    }
    this.emitChange();
  }

  getAvailableFooterFields(): DataBindingDefinition[] {
    return this.activeDataSets
      .flatMap(ds => ds.footerFields)
      .filter(field => !PAGE_LAYOUT_FIELD_KEYS.includes(field.key));
  }

  addTableFooterField(section: ReportSection, binding: DataBindingDefinition): void {
    this.fieldService.addTableFooterField(section, binding, b => this.getFieldDisplayLabel(b));
    this.emitChange();
  }

  isTableFooterField(field: ReportField): boolean {
    return this.bodySections.some(s => s.tableFooterFields?.includes(field));
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

  isBodyTableField(field: ReportField): boolean {
    return this.bodySections.some(s => s.fields.includes(field));
  }

  getFormulaFooterColumnOptions(field: ReportField): { index: number; label: string }[] {
    const section = this.bodySections.find(s => s.tableFooterFields?.includes(field));
    if (!section) return [];
    return [...section.fields]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((f, i) => ({ index: i, label: f.name || f.dataBinding }));
  }

  setFormulaFooterColumn(field: ReportField, colIndex: number): void {
    field.sortOrder = colIndex;
    this.emitChange();
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

  addFormulaField(section: ReportSection): void {
    this.activeField = this.fieldService.addFormulaField(section);
    this.emitChange();
  }

  addFormulaFooterField(section: ReportSection): void {
    this.activeField = this.fieldService.addFormulaFooterField(section);
    this.emitChange();
  }

  openFormulaEditor(field: ReportField): void {
    this.formulaSvc.openFormulaEditor(field, this.bodySections, this.sourceId(), this.dataSetIds());
  }

  emitChange(): void {
    this.template.set({ ...this.template() });
  }
}
