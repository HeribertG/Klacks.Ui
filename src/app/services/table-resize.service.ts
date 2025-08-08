import { Injectable, inject } from '@angular/core';
import { Observable, fromEvent, merge } from 'rxjs';
import { map, debounceTime, startWith } from 'rxjs/operators';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { MessageLibrary } from '../helpers/string-constants';
import { isNumeric } from '../helpers/format-helper';

@Injectable()
export class TableResizeService {
  private localStorageService = inject(LocalStorageService);

  private defaultRowHeight = 45;
  private minRowHeight = 41;
  private readonly UI_OFFSET = 234; // 9 * 26px for headers, footers, padding
  private readonly MIN_ITEMS_PER_PAGE = 5;

  setRowHeights(defaultHeight?: number, minHeight?: number): void {
    if (defaultHeight !== undefined) {
      this.defaultRowHeight = defaultHeight;
    }
    if (minHeight !== undefined) {
      this.minRowHeight = minHeight;
    }
  }

  calculateOptimalRowCount(
    tableElement: HTMLElement,
    maxItems?: number
  ): number {
    const availableHeight = this.calculateAvailableHeight(tableElement);
    // Use fixed row height instead of measuring current rows
    // This prevents calculation from being affected by current data amount
    const rowHeight = this.getConsistentRowHeight(tableElement);

    let optimalRows = Math.floor(availableHeight / rowHeight);

    optimalRows = Math.max(optimalRows, this.MIN_ITEMS_PER_PAGE);

    if (maxItems && optimalRows > maxItems) {
      optimalRows = maxItems;
    }

    return optimalRows;
  }

  private getConsistentRowHeight(tableElement: HTMLElement): number {
    const measuredHeight = this.measureAverageRowHeight(tableElement);
    
    const tbody = tableElement.querySelector('tbody');
    if (!tbody || tbody.rows.length < 3) {
      return this.defaultRowHeight;
    }
    
    return measuredHeight;
  }

  private calculateAvailableHeight(tableElement: HTMLElement): number {
    const windowHeight = window.innerHeight;
    const tableTop = tableElement.offsetTop;
    
    return windowHeight - (tableTop + this.UI_OFFSET);
  }

  private measureAverageRowHeight(tableElement: HTMLElement): number {
    const table = tableElement.querySelector('table') || tableElement;
    const tbody = table.querySelector('tbody');

    if (!tbody || tbody.rows.length === 0) {
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

  createWindowResizeObservable(): Observable<Event> {
    return fromEvent(window, 'resize').pipe(debounceTime(150));
  }

  createTableResizeObservable(
    tableElement: HTMLElement
  ): Observable<ResizeObserverEntry[]> {
    return new Observable<ResizeObserverEntry[]>((subscriber) => {
      const resizeObserver = new ResizeObserver((entries) => {
        subscriber.next(entries);
      });

      resizeObserver.observe(tableElement);

      return () => {
        resizeObserver.disconnect();
      };
    }).pipe(debounceTime(100));
  }

  createResizeObservable(
    tableElement: HTMLElement,
    maxItems?: number
  ): Observable<number> {
    const windowResize$ = this.createWindowResizeObservable();
    const tableResize$ = this.createTableResizeObservable(tableElement);

    return merge(windowResize$, tableResize$).pipe(
      startWith(null),
      map(() => this.calculateOptimalRowCount(tableElement, maxItems)),
      debounceTime(50)
    );
  }

  getSavedRowSize(): number | null {
    const saved = this.localStorageService.get(
      MessageLibrary.SELECTED_ROW_ORDER
    );
    if (saved && isNumeric(saved)) {
      return +saved;
    }
    return null;
  }

  saveRowSize(value: number): void {
    this.localStorageService.set(
      MessageLibrary.SELECTED_ROW_ORDER,
      value.toString()
    );
  }

  isAutoMode(rowSize?: number | null): boolean {
    const saved = rowSize ?? this.getSavedRowSize();
    return saved === -1 || saved === null;
  }

  getEffectiveRowSize(tableElement: HTMLElement, maxItems?: number): number {
    const savedRowSize = this.getSavedRowSize();

    if (this.isAutoMode(savedRowSize)) {
      return this.calculateOptimalRowCount(tableElement, maxItems);
    }

    return savedRowSize ?? this.MIN_ITEMS_PER_PAGE;
  }
}
