import { Injectable, inject } from '@angular/core';
import { Observable, fromEvent, merge } from 'rxjs';
import { map, debounceTime, startWith } from 'rxjs/operators';
import { LocalStorageService } from 'src/app/infrastructure/storage/local-storage.service';
import { MessageLibrary } from 'src/app/application/helpers/string-constants';
import { isNumeric } from 'src/app/shared/helpers/number.helper';

@Injectable()
export class ShiftTableResizeService {
  private localStorageService = inject(LocalStorageService);

  private defaultRowHeight = 90;
  private minRowHeight = 82;
  private readonly UI_OFFSET = 234;
  private readonly MIN_ITEMS_PER_PAGE = 3;
  private readonly ROWS_PER_DATA_ITEM = 2;

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
    const rowHeight = this.getConsistentRowHeight(tableElement);

    let optimalRows = Math.floor(availableHeight / rowHeight);

    optimalRows = Math.max(optimalRows, this.MIN_ITEMS_PER_PAGE);

    if (maxItems && optimalRows > maxItems) {
      optimalRows = maxItems;
    }

    return optimalRows;
  }

  private getConsistentRowHeight(tableElement: HTMLElement): number {
    const tbody = tableElement.querySelector('tbody');

    if (!tbody || tbody.rows.length < this.ROWS_PER_DATA_ITEM) {
      return this.defaultRowHeight;
    }

    const measuredHeight = this.measureAverageShiftRowHeight(tableElement);

    if (measuredHeight > 0) {
      return measuredHeight;
    }

    return this.defaultRowHeight;
  }

  private calculateAvailableHeight(tableElement: HTMLElement): number {
    const windowHeight = window.innerHeight;
    const tableTop = tableElement.offsetTop;

    return windowHeight - (tableTop + this.UI_OFFSET);
  }

  private measureAverageShiftRowHeight(tableElement: HTMLElement): number {
    const table = tableElement.querySelector('table') || tableElement;
    const tbody = table.querySelector('tbody');

    if (!tbody || tbody.rows.length === 0) {
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
      MessageLibrary.SELECTED_ROW_ORDER_SHIFT
    );
    if (saved && isNumeric(saved)) {
      return +saved;
    }
    return null;
  }

  saveRowSize(value: number): void {
    this.localStorageService.set(
      MessageLibrary.SELECTED_ROW_ORDER_SHIFT,
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
