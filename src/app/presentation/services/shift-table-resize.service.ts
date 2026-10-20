// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { debounceTime, startWith } from 'rxjs/operators';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { BaseTableResizeService } from './base-table-resize.service';

@Injectable()
export class ShiftTableResizeService extends BaseTableResizeService {
  private readonly MIN_ITEMS_PER_PAGE = 3;
  private readonly ROWS_PER_DATA_ITEM = 2;
  private readonly DEFAULT_ROW_HEIGHT = 70;
  private readonly MIN_ROW_HEIGHT = 50;
  private readonly SAFETY_MARGIN = 8;
  private readonly SCROLLABLE_OVERFLOW_VALUES = ['auto', 'scroll'];
  private readonly OUT_OF_FLOW_POSITIONS = ['fixed', 'absolute'];

  protected getMinItemsPerPage(): number {
    return this.MIN_ITEMS_PER_PAGE;
  }

  protected getDefaultRowHeight(): number {
    return this.DEFAULT_ROW_HEIGHT;
  }

  protected getMinRowHeight(): number {
    return this.MIN_ROW_HEIGHT;
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

  override calculateAvailableHeight(tableElement: HTMLElement): number {
    const tbody = tableElement.querySelector('tbody');
    const scrollContainer = this.findScrollContainer(tableElement);
    const contentBottom = scrollContainer
      ? this.measureContentBottom(tableElement, scrollContainer)
      : null;

    if (!tbody || !scrollContainer || contentBottom === null) {
      return super.calculateAvailableHeight(tableElement);
    }

    const visibleBottom =
      scrollContainer.getBoundingClientRect().top + scrollContainer.clientHeight;
    const freeSpace =
      visibleBottom -
      contentBottom -
      scrollContainer.scrollTop -
      this.parsePixels(getComputedStyle(scrollContainer).paddingBottom);
    const rowsHeight = tbody.getBoundingClientRect().height;

    return Math.max(0, rowsHeight + freeSpace - this.SAFETY_MARGIN);
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

  private findScrollContainer(element: HTMLElement): HTMLElement | null {
    let current = element.parentElement;

    while (current && current !== document.body) {
      if (this.SCROLLABLE_OVERFLOW_VALUES.includes(getComputedStyle(current).overflowY)) {
        return current;
      }
      current = current.parentElement;
    }

    return null;
  }

  private measureContentBottom(element: HTMLElement, scrollContainer: HTMLElement): number | null {
    let contentRoot: HTMLElement | null = element;

    while (contentRoot && contentRoot.parentElement !== scrollContainer) {
      contentRoot = contentRoot.parentElement;
    }

    if (!contentRoot) {
      return null;
    }

    let contentBottom: number | null = null;

    for (const child of Array.from(contentRoot.children)) {
      const style = getComputedStyle(child);

      if (this.OUT_OF_FLOW_POSITIONS.includes(style.position)) {
        continue;
      }

      const bottom = child.getBoundingClientRect().bottom + this.parsePixels(style.marginBottom);
      contentBottom = contentBottom === null ? bottom : Math.max(contentBottom, bottom);
    }

    return contentBottom;
  }

  private parsePixels(value: string): number {
    const parsed = parseFloat(value);

    return Number.isNaN(parsed) ? 0 : parsed;
  }
}
