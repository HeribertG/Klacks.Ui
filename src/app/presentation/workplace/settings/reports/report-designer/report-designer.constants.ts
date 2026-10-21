// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Constants of the report designer: default inputs, size bounds of fields and tables, the ids of the
 * drag-and-drop lists, the palette group ids and the option lists of the field toolbar.
 */

import { BorderLineStyle } from 'src/app/domain/models/report/border-line-style.enum';
import { ReportSectionType } from 'src/app/domain/models/report/report-section-type.enum';
import { TextAlignment } from 'src/app/domain/models/report/text-alignment.enum';

export const SCHEDULE_SOURCE_ID = 'schedule';
export const DEFAULT_DATA_SET_IDS: readonly string[] = ['work'];
export const CUSTOM_TEXT_DATA_BINDING = 'report.customText';
export const DEFAULT_BINDING_SEPARATOR = '\n';
export const DATA_SET_TITLE_SEPARATOR = ' / ';
export const PARAMETER_REFERENCE_PATTERN = /param_[A-Za-z0-9_]+/g;
export const REPORT_DESIGNER_UNBOUND_ERROR = 'ReportDesignerStateService used before bind() was called';

export const COLUMN_WIDTH_TOTAL_PERCENT = 100;
export const MIN_SECTION_WIDTH_PERCENT = 10;
export const WIDTH_DISTRIBUTION_PRECISION = 10;
export const MIN_COLUMN_WIDTH_PERCENT = 5;
export const MAX_COLUMN_WIDTH_PERCENT = 100;
export const MIN_FONT_SIZE = 6;
export const MAX_FONT_SIZE = 48;
export const MIN_IMAGE_SIZE = 5;
export const MAX_IMAGE_SIZE = 200;

export const PALETTE_GROUP_IDS = {
  header: 'header',
  table: 'table',
  footer: 'footer',
} as const;

export const PALETTE_DROP_ID_PREFIX = 'palette-';
export const PALETTE_TABLE_DROP_ID = `${PALETTE_DROP_ID_PREFIX}${PALETTE_GROUP_IDS.table}`;
export const BODY_TABLE_DROP_ID_PREFIX = 'body-table-';
export const HEADER_ZONE_DROP_ID_PREFIX = 'zone-';
export const PAGE_FOOTER_DROP_ID = 'section-footer';
export const HEADER_PALETTE_DROP_IDS: readonly string[] = [`${PALETTE_DROP_ID_PREFIX}${PALETTE_GROUP_IDS.header}`];
export const FOOTER_PALETTE_DROP_IDS: readonly string[] = [`${PALETTE_DROP_ID_PREFIX}${PALETTE_GROUP_IDS.footer}`];

export const HEADER_ZONE_ALIGNMENTS: readonly TextAlignment[] = [TextAlignment.Left, TextAlignment.Center, TextAlignment.Right];

export const SEPARATOR_OPTIONS: readonly { value: string; labelKey: string }[] = [
  { value: '\n', labelKey: 'setting.report.designer.separatorNewline' },
  { value: ', ', labelKey: 'setting.report.designer.separatorComma' },
  { value: ' ', labelKey: 'setting.report.designer.separatorSpace' },
  { value: ' - ', labelKey: 'setting.report.designer.separatorDash' },
];

export const BORDER_LINE_STYLE_OPTIONS: readonly { value: BorderLineStyle; labelKey: string }[] = [
  { value: BorderLineStyle.None, labelKey: 'setting.report.designer.borderNone' },
  { value: BorderLineStyle.Thin, labelKey: 'setting.report.designer.borderThin' },
  { value: BorderLineStyle.Medium, labelKey: 'setting.report.designer.borderMedium' },
  { value: BorderLineStyle.Thick, labelKey: 'setting.report.designer.borderThick' },
  { value: BorderLineStyle.Dashed, labelKey: 'setting.report.designer.borderDashed' },
  { value: BorderLineStyle.Double, labelKey: 'setting.report.designer.borderDouble' },
];

export const SECTION_LABELS: Readonly<Record<number, string>> = {
  [ReportSectionType.Header]: 'setting.report.designer.sectionHeader',
  [ReportSectionType.WorkTable]: 'setting.report.designer.sectionWorkTable',
  [ReportSectionType.ExpensesTable]: 'setting.report.designer.sectionExpensesTable',
  [ReportSectionType.Footer]: 'setting.report.designer.sectionFooter',
};
