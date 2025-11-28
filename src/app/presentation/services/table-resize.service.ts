import { Injectable } from '@angular/core';
import { MessageLibrary } from 'src/app/application/helpers/string-constants';
import { BaseTableResizeService } from './base-table-resize.service';

@Injectable()
export class TableResizeService extends BaseTableResizeService {
  private readonly MIN_ITEMS_PER_PAGE = 5;

  protected getMinItemsPerPage(): number {
    return this.MIN_ITEMS_PER_PAGE;
  }

  protected getDefaultRowHeight(): number {
    return 45;
  }

  protected getMinRowHeight(): number {
    return 41;
  }

  protected getRowsPerDataItem(): number {
    return 1;
  }

  protected getStorageKey(): string {
    return MessageLibrary.SELECTED_ROW_ORDER;
  }

  protected measureAverageRowHeight(tableElement: HTMLElement): number {
    const table = tableElement.querySelector('table') || tableElement;
    const tbody = table.querySelector('tbody');

    if (!tbody || tbody.rows.length === 0) {
      return this.defaultRowHeight;
    }

    if (tbody.rows.length < 3) {
      return this.defaultRowHeight;
    }

    let totalHeight = 0;
    let rowCount = 0;
    let minHeight = Number.MAX_VALUE;
    let maxHeight = 0;

    for (const row of Array.from(tbody.rows)) {
      const rowHeight = row.clientHeight;
      if (rowHeight > 0) {
        totalHeight += rowHeight;
        rowCount++;
        minHeight = Math.min(minHeight, rowHeight);
        maxHeight = Math.max(maxHeight, rowHeight);
      }
    }

    if (rowCount === 0) {
      return this.defaultRowHeight;
    }

    let averageHeight = Math.round(totalHeight / rowCount);

    const heightVariation = maxHeight / minHeight;
    if (heightVariation >= 2.5) {
      averageHeight = maxHeight;
    }

    return Math.max(averageHeight, this.minRowHeight);
  }
}
