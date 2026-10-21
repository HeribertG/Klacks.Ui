// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Ids and connections of the drag-and-drop lists of the report designer: palette groups, header zones,
 * body tables and the page footer.
 * @param group - Palette group whose drop id or drop targets are requested
 * @param section - Body table whose drop id is requested
 * @param rowIndex - Header row of a header zone
 * @param alignment - Alignment (left, center, right) of a header zone
 */

import { Injectable, inject } from '@angular/core';

import { ReportSection } from 'src/app/domain/models/report/report-section.model';
import { ReportSectionType } from 'src/app/domain/models/report/report-section-type.enum';
import { TextAlignment } from 'src/app/domain/models/report/text-alignment.enum';
import { FieldPaletteGroup } from '../field-palette-group.interface';
import {
  BODY_TABLE_DROP_ID_PREFIX,
  FOOTER_PALETTE_DROP_IDS,
  HEADER_PALETTE_DROP_IDS,
  HEADER_ZONE_ALIGNMENTS,
  HEADER_ZONE_DROP_ID_PREFIX,
  PAGE_FOOTER_DROP_ID,
  PALETTE_DROP_ID_PREFIX,
  PALETTE_TABLE_DROP_ID,
} from '../report-designer.constants';
import { groupDataSetsByFields } from '../report-designer-palette.helper';
import { ReportDesignerFieldService } from './report-designer-field.service';
import { ReportDesignerStateService } from './report-designer-state.service';

@Injectable()
export class ReportDesignerDropZoneService {
  readonly headerPaletteIds: string[] = [...HEADER_PALETTE_DROP_IDS];
  readonly footerPaletteIds: string[] = [...FOOTER_PALETTE_DROP_IDS];
  readonly pageFooterDropId = PAGE_FOOTER_DROP_ID;

  private state = inject(ReportDesignerStateService);
  private fieldService = inject(ReportDesignerFieldService);

  getPaletteDropId(group: FieldPaletteGroup): string {
    return PALETTE_DROP_ID_PREFIX + group.id;
  }

  getBodyTableDropId(section: ReportSection): string {
    return BODY_TABLE_DROP_ID_PREFIX + this.state.bodySections.indexOf(section);
  }

  get allBodyTableDropIds(): string[] {
    return this.state.bodySections.map(s => this.getBodyTableDropId(s));
  }

  getHeaderZoneId(rowIndex: number, alignment: TextAlignment): string {
    return `${HEADER_ZONE_DROP_ID_PREFIX}${rowIndex}-${HEADER_ZONE_ALIGNMENTS.indexOf(alignment)}`;
  }

  get headerZoneIds(): string[] {
    const headerSection = this.state.getSection(ReportSectionType.Header);
    if (!headerSection) return [];
    const rows = this.fieldService.getHeaderRows(headerSection);
    const ids: string[] = [];
    for (const row of rows) {
      ids.push(...HEADER_ZONE_ALIGNMENTS.map(alignment => this.getHeaderZoneId(row.rowIndex, alignment)));
    }
    return ids;
  }

  getPaletteConnectedTo(group: FieldPaletteGroup): string[] {
    if (group.sectionType === ReportSectionType.Header) {
      return this.headerZoneIds;
    }
    if (group.sectionType === ReportSectionType.Footer) {
      return [PAGE_FOOTER_DROP_ID];
    }
    return this.allBodyTableDropIds;
  }

  get allTablePaletteIds(): string[] {
    const dataSets = this.state.activeDataSets;
    if (dataSets.length <= 1) return [PALETTE_TABLE_DROP_ID];
    return groupDataSetsByFields(dataSets).map((_, i) => `${PALETTE_TABLE_DROP_ID}-${i}`);
  }
}
