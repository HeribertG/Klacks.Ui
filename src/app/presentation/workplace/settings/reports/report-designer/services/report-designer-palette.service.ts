// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Field palette of the report designer: builds the palette groups of the active data sets, filters fields
 * that are already placed and resolves the display label of a field, prefixed with its data set when two
 * data sets share the same label.
 * @param group - Palette group whose available fields are requested
 * @param field - Field definition whose display label is resolved
 */

import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { ReportSectionType } from 'src/app/domain/models/report/report-section-type.enum';
import { DataBindingDefinition } from 'src/app/domain/models/report/data-binding-definition.interface';
import { FieldCategory } from 'src/app/domain/models/report/field-category.enum';
import { ReportDataSet } from 'src/app/domain/models/report/report-data-set.interface';
import { getFieldPrefixMap } from 'src/app/domain/models/report/report-data-source.model';
import { FieldPaletteGroup } from '../field-palette-group.interface';
import { DATA_SET_TITLE_SEPARATOR, PALETTE_GROUP_IDS } from '../report-designer.constants';
import { deduplicateFields, groupDataSetsByFields } from '../report-designer-palette.helper';
import { ReportDesignerFieldService } from './report-designer-field.service';
import { ReportDesignerStateService } from './report-designer-state.service';

const HEADER_FIELDS_TITLE_KEY = 'setting.report.designer.headerFields';
const TABLE_FIELDS_TITLE_KEY = 'setting.report.designer.tableFields';
const FOOTER_FIELDS_TITLE_KEY = 'setting.report.designer.footerFields';

@Injectable()
export class ReportDesignerPaletteService {
  private state = inject(ReportDesignerStateService);
  private fieldService = inject(ReportDesignerFieldService);
  private translate = inject(TranslateService);

  private fieldPrefixMap = new Map<string, string>();

  get paletteGroups(): FieldPaletteGroup[] {
    const dataSets = this.state.activeDataSets;
    if (dataSets.length === 0) {
      this.fieldPrefixMap = new Map();
      return [];
    }

    this.fieldPrefixMap = getFieldPrefixMap(this.state.sourceId(), this.state.dataSetIds(), k => this.translate.instant(k));

    if (dataSets.length <= 1) {
      return this.buildSingleDataSetGroups(dataSets);
    }
    return this.buildMultiDataSetGroups(dataSets);
  }

  getFieldDisplayLabel(field: DataBindingDefinition): string {
    const prefix = this.fieldPrefixMap.get(field.key);
    const label = this.translate.instant(field.i18nKey);
    return prefix ? `${prefix}.${label}` : label;
  }

  getAvailableFields(group: FieldPaletteGroup): DataBindingDefinition[] {
    if (group.sectionType === ReportSectionType.Header || group.sectionType === ReportSectionType.Footer) {
      return group.fields.filter(f => !this.fieldService.isFieldInSection(f, this.state.getSection(group.sectionType)));
    }
    return group.fields;
  }

  private buildSingleDataSetGroups(dataSets: ReportDataSet[]): FieldPaletteGroup[] {
    return [
      this.buildHeaderGroup(dataSets),
      { id: PALETTE_GROUP_IDS.table, titleKey: TABLE_FIELDS_TITLE_KEY, category: FieldCategory.WorkTable, sectionType: ReportSectionType.WorkTable, fields: dataSets[0].tableFields, collapsed: false },
      { id: PALETTE_GROUP_IDS.footer, titleKey: FOOTER_FIELDS_TITLE_KEY, category: FieldCategory.Footer, sectionType: ReportSectionType.Footer, fields: dataSets[0].footerFields, collapsed: false },
    ];
  }

  private buildMultiDataSetGroups(dataSets: ReportDataSet[]): FieldPaletteGroup[] {
    const groups: FieldPaletteGroup[] = [this.buildHeaderGroup(dataSets)];

    const dsGroups = groupDataSetsByFields(dataSets);
    for (let i = 0; i < dsGroups.length; i++) {
      const g = dsGroups[i];
      const combinedTitle = g.dataSets.map(ds => this.translate.instant(ds.i18nKey)).join(DATA_SET_TITLE_SEPARATOR);
      groups.push({
        id: `${PALETTE_GROUP_IDS.table}-${i}`,
        titleKey: TABLE_FIELDS_TITLE_KEY,
        title: combinedTitle,
        category: FieldCategory.WorkTable,
        sectionType: ReportSectionType.WorkTable,
        fields: g.dataSets[0].tableFields,
        collapsed: false,
      });
    }

    groups.push({
      id: PALETTE_GROUP_IDS.footer,
      titleKey: FOOTER_FIELDS_TITLE_KEY,
      category: FieldCategory.Footer,
      sectionType: ReportSectionType.Footer,
      fields: deduplicateFields(dataSets.flatMap(ds => ds.footerFields)),
      collapsed: false,
    });

    return groups;
  }

  private buildHeaderGroup(dataSets: ReportDataSet[]): FieldPaletteGroup {
    return { id: PALETTE_GROUP_IDS.header, titleKey: HEADER_FIELDS_TITLE_KEY, category: FieldCategory.Header, sectionType: ReportSectionType.Header, fields: deduplicateFields(dataSets.flatMap(ds => ds.headerFields)), collapsed: false };
  }
}
