// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { debounceTime, startWith } from 'rxjs/operators';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { BaseTableResizeService } from './base-table-resize.service';

@Injectable()
export class ShiftTableResizeService extends BaseTableResizeService {
  private readonly MIN_ITEMS_PER_PAGE = 3;
  private readonly ROWS_PER_DATA_ITEM = 2;

  protected getMinItemsPerPage(): number {
    return this.MIN_ITEMS_PER_PAGE;
  }

  protected getDefaultRowHeight(): number {
    return 90;
  }

  protected getMinRowHeight(): number {
    return 82;
  }

  protected getRowsPerDataItem(): number {
    return this.ROWS_PER_DATA_ITEM;
  }

  protected getStorageKey(): string {
    return DomainMessages.SELECTED_ROW_ORDER_SHIFT;
  }

  protected measureAverageRowHeight(tableElement: HTMLElement): number {
    const table = tableElement.querySelector('table') || tableElement;
    const tbody = table.querySelector('tbody');

    if (!tbody || tbody.rows.length === 0) {
      return this.defaultRowHeight;
    }

    if (tbody.rows.length < this.ROWS_PER_DATA_ITEM) {
      return this.defaultRowHeight;
    }

    let totalHeight = 0;
    let dataItemCount = 0;

    const rows = Array.from(tbody.rows);
    const maxPairsToMeasure = Math.floor(rows.length / this.ROWS_PER_DATA_ITEM);

    for (let i = 0; i < maxPairsToMeasure; i++) {
      const firstRowIndex = i * this.ROWS_PER_DATA_ITEM;
      const secondRowIndex = firstRowIndex + 1;

      if (secondRowIndex < rows.length) {
        const firstRowHeight = rows[firstRowIndex].clientHeight;
        const secondRowHeight = rows[secondRowIndex].clientHeight;

        if (firstRowHeight > 0 && secondRowHeight > 0) {
          totalHeight += (firstRowHeight + secondRowHeight);
          dataItemCount++;
        }
      }
    }

    if (dataItemCount === 0) {
      return this.defaultRowHeight;
    }

    const averageHeight = Math.round(totalHeight / dataItemCount);

    return Math.max(averageHeight, this.minRowHeight);
  }

  createScrollbarVisibilityObservable(): Observable<boolean> {
    return new Observable<boolean>((subscriber) => {
      const checkScrollbar = () => {
        const hasVerticalScrollbar =
          document.documentElement.scrollHeight > document.documentElement.clientHeight;
        subscriber.next(hasVerticalScrollbar);
      };

      checkScrollbar();

      const resizeObserver = new ResizeObserver(() => {
        checkScrollbar();
      });

      const mutationObserver = new MutationObserver(() => {
        checkScrollbar();
      });

      resizeObserver.observe(document.body);
      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });

      const resizeHandler = () => checkScrollbar();
      window.addEventListener('resize', resizeHandler);

      return () => {
        resizeObserver.disconnect();
        mutationObserver.disconnect();
        window.removeEventListener('resize', resizeHandler);
      };
    }).pipe(
      debounceTime(50),
      startWith(document.documentElement.scrollHeight > document.documentElement.clientHeight)
    );
  }

  hasVerticalScrollbar(): boolean {
    return document.documentElement.scrollHeight > document.documentElement.clientHeight;
  }
}
